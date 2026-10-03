"""
Curated sample emails for instant testing in the Phishing Email Detection Web Application.
Includes diverse phishing threat vectors and legitimate workplace/transactional communications.
"""

SAMPLE_EMAILS = [
    {
        "id": "phish-1",
        "title": "Urgent: Refund Pending Confirmation",
        "sender": "priya-support@refund-portal.xyz",
        "subject": "Urgent: Refund Pending - Action Required",
        "body": "Dear Valued Customer,\n\nWe are writing to notify you that your pending tax refund of $482.50 could not be deposited due to incorrect banking details.\n\nPlease immediately confirm your identity and banking credentials at http://irs-refund-claim.xyz/verify-now to avoid immediate cancellation.\n\nFailure to verify within 24 hours will result in permanent forfeiture of your funds.\n\nSecurity Department",
        "expected_label": "phishing",
        "category": "Financial Phishing"
    },
    {
        "id": "phish-2",
        "title": "Account Suspension Alert",
        "sender": "security-alert@netflix-billing-update.info",
        "subject": "Action Needed: Subscription Renewal Suspended",
        "body": "Dear Member,\n\nSomeone attempted to log in from an unrecognized device in a foreign location. Your streaming account has been temporarily suspended to protect your personal information.\n\nUpdate your account details and password immediately: http://account-update-now.info/login\n\nIf you do not update your billing credentials now, your account will be permanently terminated.\n\nRegards,\nCustomer Support Team",
        "expected_label": "phishing",
        "category": "Credential Harvesting"
    },
    {
        "id": "phish-3",
        "title": "IT Helpdesk Urgent Password Reset",
        "sender": "admin-helpdesk@university-portal.tk",
        "subject": "Security Notice - Mailbox Storage Exceeded",
        "body": "Attention Staff and Students,\n\nYour mailbox quota has exceeded 99.8% capacity. You will stop receiving incoming emails in 2 hours unless you validate your mailbox credentials.\n\nVerify and upgrade your storage at: http://webmail-storage-quota.tk/auth\n\nDo not ignore this notice. Unverified accounts will be deleted by the system administrator.",
        "expected_label": "phishing",
        "category": "IT / Impersonation"
    },
    {
        "id": "legit-1",
        "title": "Weekly Project Sprint Sync",
        "sender": "team-lead@teamworkspace.com",
        "subject": "Update: Sprint 14 Planning & Demo Schedule",
        "body": "Hi Ryan,\n\nJust wanted to share the agenda for our upcoming sprint demo this Thursday at 2:00 PM. We'll be reviewing the newly released NLP pipeline and discussing model evaluation metrics.\n\nPlease update your ticket progress in Jira before tomorrow's standup. Let me know if you need any adjustments to the schedule.\n\nBest regards,\nAlex Martinez\nEngineering Lead",
        "expected_label": "legitimate",
        "category": "Internal Workplace"
    },
    {
        "id": "legit-2",
        "title": "Monthly Cloud Invoice Receipt",
        "sender": "billing-noreply@aws-services.com",
        "subject": "FYI - Monthly Invoice #INV-2026-9481",
        "body": "Dear Customer,\n\nYour monthly billing statement for the period of July 1 to July 31 is now ready for your review. The total charged to your registered payment method is $42.18.\n\nYou can view the detailed breakdown in your organization console at your convenience.\n\nThank you for choosing our cloud services.",
        "expected_label": "legitimate",
        "category": "Billing Receipt"
    },
    {
        "id": "legit-3",
        "title": "Campus Seminar Invitation",
        "sender": "events@university.edu",
        "subject": "Invitation: Annual Data Science & AI Symposium",
        "body": "Dear Students and Faculty,\n\nYou are cordially invited to attend the Annual IICT Artificial Intelligence Symposium on Friday, August 15th in the main auditorium. Keynote topics will explore transformer models, NLP feature engineering, and cyber threat detection.\n\nRefreshments will be served following the panel discussions.\n\nWarm regards,\nAcademic Events Committee",
        "expected_label": "legitimate",
        "category": "Academic / Informational"
    }
]
