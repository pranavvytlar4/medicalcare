const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transporter configured for Gmail or custom SMTP.
 */
const getTransporter = () => {
    const user = process.env.EMAIL_USER || process.env.GMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.GMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

    if (!user || !pass) {
        return null;
    }

    // Gmail Service Configuration
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: user.trim(),
            pass: pass.trim().replace(/\s+/g, '') // remove spaces from Gmail app passwords
        },
        tls: {
            rejectUnauthorized: false
        }
    });
};

/**
 * Sends a stylized HTML OTP verification email to the user's Gmail.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otp - 6-digit verification code
 * @param {string} [options.name] - User name if available
 */
const sendOtpEmail = async ({ to, otp, name }) => {
    const transporter = getTransporter();
    const senderEmail = process.env.EMAIL_USER || process.env.GMAIL_USER || 'no-reply@medicalcare.com';

    // Build Premium HTML Email Template
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Medical Care Verification Code</title>
        <style>
            body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .email-container { max-width: 560px; margin: 30px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; }
            .header-banner { background: linear-gradient(135deg, #2563eb 0%, #06b6d4 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
            .header-icon { display: inline-block; width: 52px; height: 52px; line-height: 52px; background: rgba(255, 255, 255, 0.2); border-radius: 14px; font-size: 26px; margin-bottom: 12px; }
            .header-title { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
            .header-sub { margin: 6px 0 0; font-size: 14px; opacity: 0.9; }
            .content-body { padding: 32px 28px; color: #1e293b; }
            .greeting { font-size: 16px; font-weight: 600; margin-bottom: 14px; color: #0f172a; }
            .desc { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
            .otp-box-wrap { text-align: center; margin: 28px 0; }
            .otp-box { display: inline-block; padding: 16px 36px; background: #eff6ff; border: 2px dashed #3b82f6; border-radius: 16px; text-align: center; }
            .otp-label { font-size: 11px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
            .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #1d4ed8; letter-spacing: 8px; margin: 0; }
            .timer-badge { display: inline-block; margin-top: 14px; font-size: 12px; color: #64748b; background: #f8fafc; padding: 4px 12px; border-radius: 20px; border: 1px solid #e2e8f0; }
            .notice-card { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 8px; font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 24px; }
            .footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
    </head>
    <body>
        <div class="email-container">
            <div class="header-banner">
                <div class="header-icon">🏥</div>
                <h1 class="header-title">Medical Care Health Portal</h1>
                <p class="header-sub">Secure Account Verification</p>
            </div>
            <div class="content-body">
                <div class="greeting">Hello${name ? ` ${name}` : ''},</div>
                <p class="desc">
                    We received a request to reset your password for your <strong>Medical Care</strong> portal account. Use the one-time verification code (OTP) below to proceed.
                </p>
                <div class="otp-box-wrap">
                    <div class="otp-box">
                        <div class="otp-label">Your Verification Code</div>
                        <div class="otp-code">${otp}</div>
                    </div>
                    <div>
                        <span class="timer-badge">⏱️ Valid for 10 minutes</span>
                    </div>
                </div>
                <div class="notice-card">
                    <strong>Security Notice:</strong> Never share this OTP with anyone. Medical Care staff will never ask for your verification code. If you did not make this request, you can safely ignore this email.
                </div>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} Medical Care Healthcare System. All rights reserved.<br>
                This is an automated security notification; please do not reply to this email.
            </div>
        </div>
    </body>
    </html>
    `;

    if (!transporter) {
        console.warn(`\n======================================================`);
        console.warn(`⚠️ [EMAIL CONFIG NOT FOUND in .env]`);
        console.warn(`Recipient: ${to}`);
        console.warn(`Generated OTP: ${otp}`);
        console.warn(`To send actual emails to Gmail, please add to your .env:`);
        console.warn(`EMAIL_USER=yourgmail@gmail.com`);
        console.warn(`EMAIL_PASS=your16chargoogleapppassword`);
        console.warn(`======================================================\n`);
        return {
            sent: false,
            configured: false,
            message: 'Email credentials not configured in .env. Falling back to local console dispatch.'
        };
    }

    try {
        const info = await transporter.sendMail({
            from: `"Medical Care Portal" <${senderEmail}>`,
            to: to,
            subject: `🏥 Your Medical Care Verification Code: ${otp}`,
            text: `Your Medical Care password reset verification code is: ${otp}. It expires in 10 minutes.`,
            html: htmlContent
        });

        console.log(`[Email Sent to Gmail] MessageId: ${info.messageId} to: ${to}`);
        return {
            sent: true,
            configured: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error(`[Gmail Dispatch Failed]:`, error.message);
        return {
            sent: false,
            configured: true,
            error: error.message
        };
    }
};

module.exports = {
    sendOtpEmail,
    getTransporter
};
