import html

def get_clean_logo_url(logo_url):
    # If logo is not provided or points to local address, fallback to the public YouTube CDN logo of the church
    if not logo_url or "localhost" in logo_url or "127.0.0.1" in logo_url:
        return "https://yt3.googleusercontent.com/MzXpaIPuA2IxX0c-y6YiS3_nYgFDnZWvMVNpVgqHYWCvRg74S2Pjn7ZlfgCXFLcVWz8tvu1VAA=s176-c-k-c0x00ffffff-no-rj"
    return logo_url

def get_onboarding_email_html(church_name, logo_url, chef_prenom, chef_nom, dept_name, login_url, email, password=None):
    logo_url = get_clean_logo_url(logo_url)
    logo_img = f'<img src="{logo_url}" alt="{church_name}" style="height: 80px; max-height: 80px; width: auto; display: block; margin: 0 auto 20px auto; border-radius: 12px; border: 2px solid #EFA315;" />'
    
    if password:
        credentials_block = f"""
        <div style="background-color: #F4F7FA; border: 1px solid #d5e1ee; border-radius: 12px; padding: 24px; margin: 25px 0; text-align: left;">
            <h3 style="margin-top: 0; color: #03254C; font-size: 16px; font-weight: 700; border-bottom: 1px solid #d5e1ee; padding-bottom: 8px;">Vos identifiants de connexion</h3>
            <p style="margin: 10px 0; font-size: 14px; color: #333333;"><strong>E-mail :</strong> <span style="font-family: monospace; color: #000;">{email}</span></p>
            <p style="margin: 10px 0; font-size: 14px; color: #333333;"><strong>Mot de passe :</strong> <span style="font-family: monospace; color: #000; background-color: #ffeeb5; padding: 2px 6px; border-radius: 4px; border: 1px solid #ffd454;">{password}</span></p>
            <p style="margin: 15px 0 0 0; font-size: 12px; color: #c0392b; font-style: italic;">* Par sécurité, nous vous recommandons de modifier votre mot de passe dès votre première connexion.</p>
        </div>
        """
        intro_text = f"Le département <strong>{html.escape(dept_name)}</strong> a été créé avec succès, et vous avez été désigné comme responsable (Chef de département)."
        action_text = "Se connecter à mon espace"
    else:
        credentials_block = ""
        intro_text = f"Vous avez été désigné comme responsable (Chef de département) pour le nouveau département <strong>{html.escape(dept_name)}</strong>."
        action_text = "Accéder à mon espace"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{html.escape(church_name)}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F4F7FA; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F7FA; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #d5e1ee; border-radius: 16px; box-shadow: 0 4px 12px rgba(3, 37, 76, 0.05); overflow: hidden; padding: 40px; text-align: left;">
                        <!-- Logo & Header -->
                        <tr>
                            <td align="center" style="padding-bottom: 20px; text-align: center;">
                                {logo_img}
                                <h1 style="color: #03254C; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px; text-transform: uppercase;">{html.escape(church_name)}</h1>
                                <div style="width: 60px; height: 4px; background-color: #EFA315; margin: 15px auto 0 auto; border-radius: 2px;"></div>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="color: #333333; font-size: 15px; line-height: 1.6; padding: 20px 0;">
                                <p style="margin-top: 0; font-size: 17px; font-weight: 700; color: #03254C;">Bonjour {html.escape(chef_prenom)} {html.escape(chef_nom)},</p>
                                <p style="color: #4A4A4A; margin-bottom: 20px;">{intro_text}</p>
                                
                                {credentials_block}
                                
                                <p style="color: #4A4A4A; margin-bottom: 25px;">Une fois connecté à votre espace, vous pourrez piloter le département, organiser des réunions, suivre les présences des membres et copier le lien d'adhésion pour recruter vos collaborateurs.</p>
                                
                                <!-- CTA Button -->
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 30px 0;">
                                    <tr>
                                        <td align="center" style="text-align: center;">
                                            <a href="{login_url}" target="_blank" style="background-color: #03254C; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 10px rgba(3, 37, 76, 0.25); border-bottom: 3px solid #021A35;">{action_text}</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Divider -->
                        <tr>
                            <td style="border-top: 1px solid #d5e1ee; padding-top: 25px; text-align: center; color: #888888; font-size: 12px; line-height: 1.5;">
                                <p style="margin: 0; font-weight: 600; color: #03254C;">Que Dieu vous bénisse abondamment !</p>
                                <p style="margin: 5px 0 0 0; color: #888888;">L'équipe {html.escape(church_name)}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_department_message_html(church_name, logo_url, dept_name, subject, message_content):
    logo_url = get_clean_logo_url(logo_url)
    logo_img = f'<img src="{logo_url}" alt="{church_name}" style="height: 60px; max-height: 60px; width: auto; display: block; margin: 0 auto 15px auto; border-radius: 8px; border: 2px solid #EFA315;" />'
    formatted_content = html.escape(message_content).replace('\n', '<br/>')

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>[{html.escape(dept_name)}] {html.escape(subject)}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F4F7FA; margin: 0; padding: 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F7FA; padding: 30px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #d5e1ee; border-radius: 12px; box-shadow: 0 4px 12px rgba(3, 37, 76, 0.03); overflow: hidden; padding: 30px; text-align: left;">
                        <!-- Logo & Header -->
                        <tr>
                            <td align="center" style="padding-bottom: 15px; border-bottom: 1px solid #d5e1ee; text-align: center;">
                                {logo_img}
                                <span style="color: #888888; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">{html.escape(church_name)}</span>
                                <h2 style="color: #03254C; font-size: 18px; font-weight: 800; margin: 5px 0 0 0;">Département : {html.escape(dept_name)}</h2>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="color: #333333; font-size: 14px; line-height: 1.6; padding: 20px 0;">
                                <h3 style="color: #03254C; font-size: 16px; margin-top: 0; margin-bottom: 15px;">{html.escape(subject)}</h3>
                                <div style="color: #4A4A4A; font-size: 14.5px;">
                                    {formatted_content}
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="border-top: 1px solid #d5e1ee; padding-top: 20px; text-align: center; color: #888888; font-size: 11px; line-height: 1.5;">
                                <p style="margin: 0; font-weight: 600; color: #03254C;">{html.escape(church_name)}</p>
                                <p style="margin: 3px 0 0 0; color: #999999;">Vous recevez ce message car vous êtes membre du département {html.escape(dept_name)}.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def get_contact_email_html(church_name, logo_url, sender_nom, sender_email, message_body):
    logo_url = get_clean_logo_url(logo_url)
    logo_img = f'<img src="{logo_url}" alt="{church_name}" style="height: 60px; max-height: 60px; width: auto; display: block; margin: 0 auto 15px auto; border-radius: 8px; border: 2px solid #EFA315;" />'
    formatted_msg = html.escape(message_body).replace('\n', '<br/>')

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouveau message de contact</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F4F7FA; margin: 0; padding: 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F4F7FA; padding: 30px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #d5e1ee; border-radius: 12px; box-shadow: 0 4px 12px rgba(3, 37, 76, 0.03); overflow: hidden; padding: 30px; text-align: left;">
                        <!-- Header -->
                        <tr>
                            <td align="center" style="padding-bottom: 15px; border-bottom: 1px solid #d5e1ee; text-align: center;">
                                {logo_img}
                                <span style="color: #888888; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">{html.escape(church_name)}</span>
                                <h2 style="color: #03254C; font-size: 18px; font-weight: 800; margin: 5px 0 0 0;">Nouveau Message de Contact</h2>
                            </td>
                        </tr>
                        
                        <!-- Details -->
                        <tr>
                            <td style="color: #333333; font-size: 14px; line-height: 1.6; padding: 20px 0;">
                                <div style="background-color: #F4F7FA; border: 1px solid #d5e1ee; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                                    <p style="margin: 5px 0; color: #333333;"><strong>Expéditeur :</strong> {html.escape(sender_nom)}</p>
                                    <p style="margin: 5px 0; color: #333333;"><strong>E-mail :</strong> <a href="mailto:{html.escape(sender_email)}" style="color: #03254C; text-decoration: underline;">{html.escape(sender_email)}</a></p>
                                </div>
                                <p style="font-weight: 700; color: #03254C; margin-bottom: 10px;">Message :</p>
                                <div style="color: #4A4A4A; font-size: 14px; line-height: 1.6; background-color: #fafafa; padding: 15px; border-radius: 8px; border: 1px solid #eee;">
                                    {formatted_msg}
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="border-top: 1px solid #d5e1ee; padding-top: 20px; text-align: center; color: #888888; font-size: 11px; line-height: 1.5;">
                                <p style="margin: 0; font-weight: 600; color: #03254C;">{html.escape(church_name)}</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
