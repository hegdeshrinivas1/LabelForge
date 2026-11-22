import random
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal, init_db
from app.models import User, Project, Label, DataItem, Task, Annotation, Review
from app.auth import get_password_hash

# 200 realistic customer feedback samples
FEEDBACK_SAMPLES = [
    # Positive samples
    "The battery life is exceptional, lasting well over two full days of heavy usage.",
    "Customer service was delightfully responsive and resolved my refund in minutes.",
    "Absolute game changer for my daily workflow! Sleek, responsive, and intuitive.",
    "Outstanding build quality with premium materials. Feels very durable and solid.",
    "Delivered two days ahead of schedule, packaged with extreme care.",
    "Exceeded all my expectations. The screen resolution and color accuracy are stunning.",
    "Smooth onboarding and very easy to set up. Took less than five minutes.",
    "The audio clarity on conference calls is noticeably superior to my old headset.",
    "Super lightweight and fits perfectly in my backpack without adding bulk.",
    "Fantastic value for money! Competitors charge twice as much for these features.",
    "Software updates have steadily improved performance and added useful features.",
    "The camera produces crisp, vivid images even in challenging low-light conditions.",
    "Very satisfied with this purchase. Will definitely be recommending to colleagues.",
    "The ergonomic grip prevents wrist fatigue during long editing sessions.",
    "Silent operation even under heavy computational load. No fan noise whatsoever.",
    "Clean, modern aesthetic that blends seamlessly into any desk setup.",
    "Quick and seamless Bluetooth pairing across all my devices.",
    "High quality materials, robust stitching, and excellent zipper construction.",
    "The mobile companion app is well designed, fast, and remarkably bug-free.",
    "Brilliant display brightness, perfectly readable outdoors under direct sunlight.",
    "Prompt, polite, and helpful technical support via live chat.",
    "Consistently fast data transfer speeds over USB-C.",
    "The auto-backup feature gives me complete peace of mind.",
    "Effortless navigation and thoughtfully placed physical controls.",
    "Remarkable noise cancellation that blocks out subway and office chatter.",
    "The vegan leather case feels luxurious and provides solid drop protection.",
    "Sturdy hinge with zero wobble when typing aggressively.",
    "Comprehensive documentation with clear diagrams and troubleshooting tips.",
    "Sensational haptic feedback that makes typing deeply satisfying.",
    "Great battery charging speed—reaches 80 percent in under 35 minutes.",
    "The keyboard travel is crisp and tactile, ideal for long coding sessions.",
    "Arrived in 100% recyclable packaging, which I truly appreciate.",
    "Smooth frame rates and zero thermal throttling during extended gaming.",
    "Very accurate heart rate and sleep tracking compared to clinical monitors.",
    "The matte finish repels fingerprints and smudges effectively.",
    "Compact power adapter that doesn't block adjacent electrical wall outlets.",
    "Intuitive shortcuts save me dozens of keystrokes every single hour.",
    "Impressive dynamic range and rich bass for such compact speakers.",
    "Zero bloatware pre-installed out of the box. Pure, clean operating system.",
    "Five star experience from ordering to delivery and daily operation.",
    "The magnetic mount holds firmly even over bumpy gravel roads.",
    "Water resistance held up flawlessly during an unexpected torrential downpour.",
    "Bright status LEDs that automatically dim in dark rooms so they don't disturb sleep.",
    "Remarkably quiet fan curve that keeps temperatures well below sixty degrees.",
    "Customizable RGB lighting that integrates cleanly with open-source software.",
    "Super fast facial recognition unlock that works reliably in dim environments.",
    "The modular design makes swapping components straightforward and tool-free.",
    "Clear microphone pickup that isolates voice from ambient background keyboard clicks.",
    "Generous cloud storage allocation included with the standard purchase.",
    "Truly an indispensable utility for any modern remote professional.",

    # Negative samples
    "The device overheats within twenty minutes of basic video streaming.",
    "Terrible customer service; waited on hold for forty minutes only to be disconnected.",
    "Flimsy plastic construction that creaks loudly whenever picked up.",
    "Constant Bluetooth disconnects while walking my phone in my pocket.",
    "Battery drains by thirty percent overnight while in idle sleep mode.",
    "The touch screen is unresponsive around the outer edges and corners.",
    "Software is riddled with memory leaks and crashes several times a day.",
    "Misleading product description. Missing several advertised cable accessories.",
    "Arrived with noticeable cosmetic scratches across the front glass panel.",
    "The charging port became loose and unreliable after only three weeks of use.",
    "Extremely slow shipping that took over three weeks longer than promised.",
    "Dull, washed-out display colors with severe backlight bleeding at the corners.",
    "Inflexible return policy and unreasonable restocking fees.",
    "Awful audio quality with tinny highs and nonexistent low frequencies.",
    "The setup process requires creating a mandatory online account for local features.",
    "Uncomfortable headband padding that causes severe pressure points after an hour.",
    "Power button requires excessive force to register a click.",
    "The companion app constantly requires location permissions for no obvious reason.",
    "Loud coil whine emitted whenever plugged into the wall charger.",
    "Fingerprint reader fails to recognize my thumb more than half the time.",
    "Firmware update completely broke Wi-Fi connectivity on the 5GHz band.",
    "Confusing user interface with buried settings and unintuitive iconography.",
    "Extremely heavy and unwieldy for everyday portable travel.",
    "Cheap rubber coating began peeling away and turning sticky within a month.",
    "Fragile screen that cracked from a minor twelve-inch drop onto carpet.",
    "Poor microphone sensitivity; coworkers complain they cannot hear me clearly.",
    "Overpriced for what amounts to last-generation internal hardware.",
    "Notification spam from pre-installed promotional software cannot be disabled.",
    "The hinge loosened within a month and now cannot hold the screen at an angle.",
    "Thermal throttling causes severe stuttering during standard office tasks.",
    "Product manual is filled with translation errors and outdated screenshots.",
    "Refused warranty claim over normal wear and tear.",
    "The cooling fan sounds like an aircraft engine even while reading a PDF.",
    "Inaccurate GPS tracking with frequent signal drops in suburban areas.",
    "Proprietary charging cable means I cannot use standard USB-C cables.",
    "Volume steps are too coarse—one click is too quiet, the next is deafening.",
    "Zero customer support response after sending three detailed inquiry emails.",
    "The kickstand collapsed spontaneously and chipped my wooden desk.",
    "Battery replacement is impossible without destroying the glued chassis.",
    "Defective pixels right in the center of the display straight out of the box.",
    "Sluggish web browsing performance despite high-speed fiber internet.",
    "Constant buffering and audio sync issues during video playback.",
    "The carrying pouch is too small and zipper catches on the fabric.",
    "Unreliable sleep tracking logs periods of reading in bed as deep sleep.",
    "Camera lens glass easily smudges and lacks any oleophobic coating.",
    "Weak Wi-Fi antenna drops connection in rooms where my phone has full bars.",
    "Subpar materials make the keyboard keys feel mushy and hollow.",
    "Mandatory subscription required to unlock basic hardware sensors.",
    "Package arrived crushed with zero protective bubble wrap.",
    "Total waste of money. Returning for a full refund immediately.",

    # Neutral samples
    "The item functions as described in the manual, neither better nor worse.",
    "Average battery life of around six hours under normal mixed usage.",
    "Standard unboxing experience with basic cardboard and documentation.",
    "Design is relatively generic and looks like most other competitors.",
    "Adequate build quality for the budget price point.",
    "Screen brightness is sufficient for indoor use but struggles slightly in sun.",
    "Software interface is plain and functional without any flashy animations.",
    "Delivery arrived on the exact estimated delivery date without issues.",
    "Sound profile is balanced but lacks distinctive punch or bass depth.",
    "Camera is acceptable for grocery receipts and document scanning.",
    "Keys feel typical for a standard membrane laptop keyboard.",
    "Device weighs roughly 1.5 kilograms, on par with similar class notebooks.",
    "Packaging was standard brown box with basic protective inserts.",
    "Setup took about fifteen minutes following the printed step by step guide.",
    "Acceptable thermal management under moderate workloads.",
    "Standard one year limited warranty included in the box.",
    "Microphone quality is good enough for casual family calls.",
    "Grey color matches the product photos fairly accurately.",
    "Buttons have moderate tactile feedback without being remarkably clicky.",
    "Charges at standard 15W speed over the provided wall brick.",
    "Firmware update took about eight minutes to download and install.",
    "Bluetooth range reaches across one standard drywall room.",
    "The included carrying bag is simple polyester with standard drawstring.",
    "Operating system is Windows 11 with standard default configurations.",
    "Fan is audible under load but within expected operating parameters.",
    "Display is standard 60Hz refresh rate 1080p panel.",
    "Contains 8GB of RAM which is adequate for basic browsing and email.",
    "Rubber feet on the bottom keep the unit moderately stationary on laminate.",
    "Webcam resolution is 720p, standard for budget business laptops.",
    "Two USB-A ports and one HDMI port provided on the left flank.",
    "Speaker placement is on the bottom edge pointing downwards.",
    "Plastic chassis with metallic grey paint coating.",
    "Fingerprint sensor speed is around one second to unlock.",
    "Documentation is provided in English, Spanish, and French.",
    "Includes basic 45W AC barrel jack power supply.",
    "Battery indicator LED changes from amber to white when fully charged.",
    "Keyboard lacks backlighting, which is typical for this tier.",
    "Standard 2.4GHz wireless mouse dongle included inside battery door.",
    "Acceptable latency for office typing and spreadsheet calculations.",
    "Product dimensions are exactly as listed in the technical specifications.",
    "Exterior dimensions fit into standard 15-inch neoprene laptop sleeves.",
    "Customer service answered my warranty question after three rings.",
    "Unit powers on in approximately twelve seconds from cold boot.",
    "Touchpad tracking speed can be adjusted in system settings.",
    "Basic stereo separation with two two-watt downward-firing drivers.",
    "Standard compliance certificates printed on the bottom label.",
    "Volume rocker is positioned on the right edge above the power button.",
    "Headphone jack supports standard 3.5mm TRRS headsets.",
    "Storage drive shows 238GB of usable space formatted NTFS.",
    "Overall an unexceptional, utilitarian piece of office equipment."
]

# Ensure we have at least 200 items by cycling with varied context
FULL_DATASET = []
for i in range(200):
    base_text = FEEDBACK_SAMPLES[i % len(FEEDBACK_SAMPLES)]
    if i < len(FEEDBACK_SAMPLES):
        FULL_DATASET.append(base_text)
    else:
        # Subtle variation for duplicate protection
        variation_suffix = f" (Order #{1000 + i})"
        FULL_DATASET.append(f"{base_text}{variation_suffix}")


def seed_database():
    """
    Populate database with clean, realistic demo data:
    - 1 Admin, 3 Annotators, 2 Reviewers
    - 1 Sentiment Classification Project with 3 labels
    - 200 text items
    - Balanced distribution of task states (Approved, Rejected, Submitted, In-Progress, Pending)
    """
    print("🌱 Initializing LabelForge demo database seed...")
    init_db()
    db = SessionLocal()

    try:
        # Wipe existing records cleanly
        db.query(Review).delete()
        db.query(Annotation).delete()
        db.query(Task).delete()
        db.query(DataItem).delete()
        db.query(Label).delete()
        db.query(Project).delete()
        db.query(User).delete()
        db.commit()

        # 1. Create Users
        admin_user = User(
            name="Sarah Jenkins (Admin)",
            email="admin@labelforge.com",
            password_hash=get_password_hash("admin123"),
            role="admin",
            is_active=True
        )

        annotators = [
            User(
                name="Alex Rivera",
                email="annotator1@labelforge.com",
                password_hash=get_password_hash("annotator123"),
                role="annotator",
                is_active=True
            ),
            User(
                name="David Chen",
                email="annotator2@labelforge.com",
                password_hash=get_password_hash("annotator123"),
                role="annotator",
                is_active=True
            ),
            User(
                name="Elena Rostova",
                email="annotator3@labelforge.com",
                password_hash=get_password_hash("annotator123"),
                role="annotator",
                is_active=True
            ),
        ]

        reviewers = [
            User(
                name="Marcus Vance (Lead QA)",
                email="reviewer1@labelforge.com",
                password_hash=get_password_hash("reviewer123"),
                role="reviewer",
                is_active=True
            ),
            User(
                name="Priya Patel (Senior QA)",
                email="reviewer2@labelforge.com",
                password_hash=get_password_hash("reviewer123"),
                role="reviewer",
                is_active=True
            ),
        ]

        db.add(admin_user)
        db.add_all(annotators)
        db.add_all(reviewers)
        db.commit()
        db.refresh(admin_user)
        for a in annotators:
            db.refresh(a)
        for r in reviewers:
            db.refresh(r)

        print(f"✅ Created 1 Admin, {len(annotators)} Annotators, {len(reviewers)} Reviewers")

        # 2. Create Project
        project = Project(
            name="Customer Feedback Sentiment",
            description="Multi-class sentiment classification benchmark to train customer satisfaction prediction models.",
            created_by=admin_user.id
        )
        db.add(project)
        db.commit()
        db.refresh(project)

        # 3. Create Labels
        labels = [
            Label(project_id=project.id, name="Positive", color="#10B981"),
            Label(project_id=project.id, name="Negative", color="#EF4444"),
            Label(project_id=project.id, name="Neutral", color="#6B7280"),
        ]
        db.add_all(labels)
        db.commit()
        for l in labels:
            db.refresh(l)

        pos_label, neg_label, neu_label = labels
        print(f"✅ Created Project '{project.name}' with 3 labels: Positive, Negative, Neutral")

        # 4. Ingest 200 Data Items and spawn Tasks
        tasks = []
        now = datetime.now(timezone.utc)

        for i, text_content in enumerate(FULL_DATASET):
            item = DataItem(project_id=project.id, content=text_content)
            db.add(item)
            db.flush()

            # Assign round-robin to annotators
            assigned_annotator = annotators[i % len(annotators)]
            task = Task(
                item_id=item.id,
                assigned_to=assigned_annotator.id,
                status="PENDING",
                assigned_at=now - timedelta(days=random.randint(5, 14))
            )
            db.add(task)
            db.flush()
            tasks.append((task, assigned_annotator, i))

        print(f"✅ Created 200 Data Items and linked Tasks assigned across annotators")

        # 5. Partition Tasks into realistic workflow states
        # - 80 tasks: APPROVED (with annotation + review approval)
        # - 25 tasks: REJECTED (with annotation + review rejection + comment)
        # - 40 tasks: SUBMITTED (with annotation, awaiting review in queue)
        # - 25 tasks: IN_PROGRESS (opened by annotator)
        # - 30 tasks: PENDING (unstarted tasks ready for labeling)

        # 80 Approved Tasks
        for idx in range(0, 80):
            task, annotator, i = tasks[idx]
            # Infer realistic label based on text
            text_lower = task.item.content.lower()
            if any(w in text_lower for w in ["exceptional", "delightfully", "game changer", "outstanding", "exceeded", "smooth", "clarity", "super", "fantastic", "crisp", "satisfied", "silent", "clean", "brilliant", "prompt", "peace", "effortless", "remarkable", "luxurious", "sturdy", "comprehensive", "sensational", "great", "tactile", "100%", "zero thermal", "accurate", "matte", "compact", "intuitive", "impressive", "pure", "five star", "firmly", "flawlessly", "bright", "quiet", "customizable", "fast", "modular", "generous", "indispensable"]):
                chosen_label = pos_label
            elif any(w in text_lower for w in ["overheats", "terrible", "flimsy", "constant", "drains", "unresponsive", "memory leaks", "misleading", "scratches", "loose", "slow", "washed-out", "inflexible", "awful", "uncomfortable", "excessive", "spam", "coil whine", "fails", "broke", "confusing", "heavy", "peeling", "cracked", "subpar", "overpriced", "loosened", "throttling", "translation errors", "refused", "aircraft", "inaccurate", "proprietary", "coarse", "zero customer", "collapsed", "impossible", "defective", "sluggish", "buffering", "catches", "smudges", "weak", "mushy", "mandatory subscription", "crushed", "waste"]):
                chosen_label = neg_label
            else:
                chosen_label = neu_label

            sub_time = now - timedelta(days=random.randint(1, 13), hours=random.randint(1, 12))
            rev_time = sub_time + timedelta(hours=random.randint(1, 8))

            annotation = Annotation(task_id=task.id, label_id=chosen_label.id, annotated_at=sub_time)
            db.add(annotation)

            reviewer = random.choice(reviewers)
            review = Review(
                task_id=task.id,
                reviewer_id=reviewer.id,
                decision="APPROVED",
                comment="Label accurately captures sentiment.",
                reviewed_at=rev_time
            )
            db.add(review)

            task.status = "APPROVED"
            task.submitted_at = sub_time
            task.updated_at = rev_time

        # 25 Rejected Tasks
        rejection_reasons = [
            "Context contains subtle irony; this expresses dissatisfaction, not approval.",
            "Customer is clearly describing a defect, label should be Negative.",
            "Factual product specification statement without sentiment, should be Neutral.",
            "Sarcastic compliment detected ('great job breaking my workflow'), correct to Negative.",
            "Customer praises delivery speed but criticizes broken product, review secondary clause."
        ]
        for idx in range(80, 105):
            task, annotator, i = tasks[idx]
            chosen_label = random.choice([pos_label, neu_label])  # mislabeled
            sub_time = now - timedelta(days=random.randint(1, 10), hours=random.randint(1, 12))
            rev_time = sub_time + timedelta(hours=random.randint(1, 6))

            annotation = Annotation(task_id=task.id, label_id=chosen_label.id, annotated_at=sub_time)
            db.add(annotation)

            reviewer = random.choice(reviewers)
            review = Review(
                task_id=task.id,
                reviewer_id=reviewer.id,
                decision="REJECTED",
                comment=random.choice(rejection_reasons),
                reviewed_at=rev_time
            )
            db.add(review)

            task.status = "REJECTED"
            task.submitted_at = sub_time
            task.updated_at = rev_time

        # 40 Submitted Tasks (Queue for Reviewer)
        for idx in range(105, 145):
            task, annotator, i = tasks[idx]
            chosen_label = random.choice(labels)
            sub_time = now - timedelta(hours=random.randint(1, 48))

            annotation = Annotation(task_id=task.id, label_id=chosen_label.id, annotated_at=sub_time)
            db.add(annotation)

            task.status = "SUBMITTED"
            task.submitted_at = sub_time
            task.updated_at = sub_time

        # 25 In-Progress Tasks
        for idx in range(145, 170):
            task, annotator, i = tasks[idx]
            task.status = "IN_PROGRESS"
            task.updated_at = now - timedelta(hours=random.randint(2, 24))

        # 30 Pending Tasks
        for idx in range(170, 200):
            task, annotator, i = tasks[idx]
            task.status = "PENDING"

        db.commit()

        print("\n🎉 Seeding completed successfully!")
        print("=" * 60)
        print("DEMO CREDENTIALS:")
        print("  Admin    : admin@labelforge.com     / admin123")
        print("  Annotators: annotator1@labelforge.com / annotator123")
        print("             annotator2@labelforge.com / annotator123")
        print("             annotator3@labelforge.com / annotator123")
        print("  Reviewers: reviewer1@labelforge.com  / reviewer123")
        print("             reviewer2@labelforge.com  / reviewer123")
        print("=" * 60)
        print("TASK DISTRIBUTION:")
        print("  Total Tasks : 200")
        print("  APPROVED    : 80  (Ready for ML dataset export)")
        print("  REJECTED    : 25  (Shows feedback banners on annotator workbench)")
        print("  SUBMITTED   : 40  (Active review queue for reviewer screen)")
        print("  IN_PROGRESS : 25  (Work-in-progress tasks)")
        print("  PENDING     : 30  (Ready for labeling)")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Seeding error: {str(e)}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
