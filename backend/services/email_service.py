import os
import logging
import resend

logger = logging.getLogger(__name__)

class EmailService:
    @staticmethod
    def send_email(to: str, subject: str, body: str, html: str = None) -> bool:
        """
        Sends an email using the Resend API.
        If RESEND_API_KEY is not configured or in testing environment,
        falls back to a mock local console logger.
        """
        api_key = os.getenv("RESEND_API_KEY")
        if api_key:
            api_key = api_key.strip('"\'')

        if not api_key:
            logger.warning(f"RESEND_API_KEY is not set. Mocking email to {to}: {subject}")
            print(f"==========================================")
            print(f"MOCK EMAIL SENT")
            print(f"To: {to}")
            print(f"Subject: {subject}")
            print(f"Body:\n{body}")
            if html:
                print(f"HTML Body:\n{html}")
            print(f"==========================================")
            return True

        try:
            resend.api_key = api_key
            
            # Resend sandboxed sender if custom domain sender is not provided
            from_email = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
            if from_email:
                from_email = from_email.strip('"\'')
            
            payload = {
                "from": from_email,
                "to": to,
                "subject": subject,
                "text": body
            }
            if html:
                payload["html"] = html
                
            res = resend.Emails.send(payload)
            logger.info(f"Email sent via Resend successfully: {res}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via Resend: {str(e)}")
            raise e
