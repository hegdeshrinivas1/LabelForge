import csv
import io
import json
from typing import Tuple, List, Set
from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.models import DataItem, Task


async def process_text_upload(
    project_id: int,
    file: UploadFile,
    db: Session,
    max_rows: int = 5000
) -> Tuple[int, int, int]:
    """
    Process an uploaded CSV or JSON file containing text data.
    - Validates file format (.csv or .json).
    - Checks for mandatory 'text' field/column.
    - Limits processing to a maximum of 5,000 rows.
    - Skips empty strings and duplicate text entries (both intra-file and existing in DB).
    - Inserts new DataItem records and automatically creates linked Task records in PENDING state.
    
    Returns:
        Tuple of (inserted_count, skipped_count, total_processed)
    """
    filename = file.filename or ""
    lower_filename = filename.lower()
    if not (lower_filename.endswith(".csv") or lower_filename.endswith(".json")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only .csv and .json files are supported."
        )

    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty."
        )

    # Decode bytes with UTF-8 BOM awareness
    try:
        decoded_text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            decoded_text = content_bytes.decode("latin-1")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to decode file. Please ensure it is UTF-8 encoded."
            )

    extracted_texts: List[str] = []

    # 1. Parse CSV
    if lower_filename.endswith(".csv"):
        reader = csv.reader(io.StringIO(decoded_text))
        try:
            header = next(reader)
        except StopIteration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file contains no rows."
            )

        # Locate the 'text' column (case-insensitive)
        text_col_idx = -1
        for idx, col_name in enumerate(header):
            if col_name.strip().lower() == "text":
                text_col_idx = idx
                break

        if text_col_idx == -1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing required column 'text' in CSV header."
            )

        for row in reader:
            if text_col_idx < len(row):
                extracted_texts.append(row[text_col_idx])
            else:
                extracted_texts.append("")

    # 2. Parse JSON
    else:
        try:
            parsed_json = json.loads(decoded_text)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON syntax: {str(exc)}"
            )

        items_list: List[dict] = []
        if isinstance(parsed_json, list):
            items_list = parsed_json
        elif isinstance(parsed_json, dict):
            # Support wrapper keys like {"data": [...]} or {"items": [...]}
            for key in ("data", "items", "records"):
                if key in parsed_json and isinstance(parsed_json[key], list):
                    items_list = parsed_json[key]
                    break
            if not items_list:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="JSON object must be an array of objects or contain a 'data'/'items' array."
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="JSON root must be an array of objects."
            )

        for item in items_list:
            if isinstance(item, dict):
                # Look for case-insensitive 'text'
                found_text = None
                for k, v in item.items():
                    if k.strip().lower() == "text":
                        found_text = str(v) if v is not None else ""
                        break
                if found_text is not None:
                    extracted_texts.append(found_text)
                else:
                    extracted_texts.append("")
            elif isinstance(item, str):
                extracted_texts.append(item)
            else:
                extracted_texts.append("")

    total_processed = len(extracted_texts)
    if total_processed > max_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed limit of {max_rows} rows (received {total_processed})."
        )

    # 3. Query existing text contents for this project to deduplicate against DB
    existing_records = db.query(DataItem.content).filter(DataItem.project_id == project_id).all()
    existing_set: Set[str] = {rec[0] for rec in existing_records}

    seen_in_batch: Set[str] = set()
    to_insert: List[str] = []
    skipped_count = 0

    for raw_text in extracted_texts:
        cleaned = raw_text.strip()
        if not cleaned:
            skipped_count += 1
            continue
        if cleaned in seen_in_batch or cleaned in existing_set:
            skipped_count += 1
            continue

        seen_in_batch.add(cleaned)
        to_insert.append(cleaned)

    # 4. Insert DataItems and spawn corresponding Tasks
    for text_content in to_insert:
        data_item = DataItem(project_id=project_id, content=text_content)
        db.add(data_item)
        db.flush()  # Generates data_item.id

        task = Task(item_id=data_item.id, status="PENDING")
        db.add(task)

    db.commit()

    inserted_count = len(to_insert)
    return (inserted_count, skipped_count, total_processed)
