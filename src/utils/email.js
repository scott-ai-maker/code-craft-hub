const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter
const createTransporter = () => {
    // For development without email config, return null to trigger logging mode
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        logger.warn('Email not configured. Verification links will be logged to console.');
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_PORT === '465',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
};

// Send verification email
const sendVerificationEmail = async (email, username, verificationToken) => {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.BASE_URL}/api/users/verify-email/${verificationToken}`;
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@code-craft-hub.com',
        to: email,
        subject: 'Verify Your Email Address',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome to Code Craft Hub, ${username}!</h2>
                <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" 
                       style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                              text-decoration: none; border-radius: 4px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    This link will expire in 24 hours. If you didn't create an account, please ignore this email.
                </p>
            </div>
        `,
    };

    if (!transporter) {
        // Log email instead of sending in dev mode without configuration
        logger.info('Verification Email (not sent - no config):', {
            to: email,
            subject: mailOptions.subject,
            verificationUrl,
        });
        console.log('\n=== EMAIL VERIFICATION LINK ===');
        console.log(`User: ${username} (${email})`);
        console.log(`Verification URL: ${verificationUrl}`);
        console.log('===============================\n');
        return { success: true, mode: 'logged' };
    }

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Verification email sent to ${email}`);
        return { success: true, mode: 'sent' };
    } catch (error) {
        logger.error('Error sending verification email:', error);
        throw new Error('Failed to send verification email');
    }
};

// Send welcome email after verification
const sendWelcomeEmail = async (email, username) => {
    const transporter = createTransporter();
    
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@code-craft-hub.com',
        to: email,
        subject: 'Welcome to Code Craft Hub!',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Welcome aboard, ${username}! 🎉</h2>
                <p>Your email has been verified successfully. You can now access all features of Code Craft Hub.</p>
                <p>Get started by exploring our platform and building amazing things!</p>
                <p style="margin-top: 30px;">Happy coding!</p>
                <p style="color: #999; font-size: 12px; margin-top: 30px;">
                    The Code Craft Hub Team
                </p>
            </div>
        `,
    };

    if (!transporter) {
        logger.info('Welcome Email (not sent - no config):', {
            to: email,
            subject: mailOptions.subject,
        });
        return { success: true, mode: 'logged' };
    }

    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Welcome email sent to ${email}`);
        return { success: true, mode: 'sent' };
    } catch (error) {
        logger.error('Error sending welcome email:', error);
        // Don't throw error for welcome email - it's not critical
        return { success: false, mode: 'failed' };
    }
};

module.exports = {
    sendVerificationEmail,
    sendWelcomeEmail,
};
