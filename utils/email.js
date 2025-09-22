const nodemailer = require('nodemailer');

// Create email transporter
const createTransporter = () => {
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Fallback to console logging in development
  if (process.env.NODE_ENV === 'development') {
    return {
      sendMail: async (options) => {
        console.log('📧 Email would be sent:');
        console.log('To:', options.to);
        console.log('Subject:', options.subject);
        console.log('Content:', options.html || options.text);
        return { messageId: 'dev-email-' + Date.now() };
      }
    };
  }

  throw new Error('Email configuration is missing');
};

// Email templates
const templates = {
  emailVerification: (name, verificationUrl) => ({
    subject: 'Verify your Plundora account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify your email</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Plundora!</h1>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>

          <p>Thank you for signing up for Plundora! To complete your registration, please verify your email address by clicking the button below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Verify Email Address</a>
          </div>

          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>

          <p style="margin-top: 30px; color: #666; font-size: 14px;">If you didn't create an account with Plundora, please ignore this email.</p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>&copy; 2024 Plundora. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (name, resetUrl) => ({
    subject: 'Reset your Plundora password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset your password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hi ${name},</h2>

          <p>We received a request to reset your password for your Plundora account. If you made this request, click the button below to reset your password:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>

          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>

          <p style="margin-top: 30px; color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>

          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>&copy; 2024 Plundora. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }),

  newSale: (buyerName, sellerName, saleTitle, saleUrl) => ({
    subject: `Your item "${saleTitle}" has been sold!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Item Sold!</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hi ${sellerName},</h2>

          <p>Great news! Your item <strong>"${saleTitle}"</strong> has been sold to ${buyerName}.</p>

          <p>Here's what happens next:</p>
          <ul>
            <li>The payment has been processed securely</li>
            <li>You'll receive the funds after the transaction is complete</li>
            <li>Please prepare the item for shipping or pickup as agreed</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${saleUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">View Sale Details</a>
          </div>

          <p>Thank you for using Plundora!</p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>&copy; 2024 Plundora. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }),

  purchaseConfirmation: (buyerName, sellerName, saleTitle, amount, trackingInfo) => ({
    subject: `Purchase confirmation: "${saleTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Purchase Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Purchase Confirmed! 🛍️</h1>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hi ${buyerName},</h2>

          <p>Thank you for your purchase! Your order has been confirmed.</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Order Details:</h3>
            <p><strong>Item:</strong> ${saleTitle}</p>
            <p><strong>Seller:</strong> ${sellerName}</p>
            <p><strong>Amount:</strong> $${amount}</p>
            ${trackingInfo ? `<p><strong>Tracking:</strong> ${trackingInfo}</p>` : ''}
          </div>

          <p>The seller has been notified and will prepare your item for shipping or pickup as agreed.</p>

          <p>We'll send you updates as your order progresses. Thank you for shopping with Plundora!</p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>&copy; 2024 Plundora. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  }),

  newMessage: (recipientName, senderName, saleTitle, messagePreview, chatUrl) => ({
    subject: `New message about "${saleTitle}"`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💬 New Message</h1>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Hi ${recipientName},</h2>

          <p>You have a new message from <strong>${senderName}</strong> regarding "${saleTitle}":</p>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6;">
            <p style="margin: 0; color: #666; font-style: italic;">"${messagePreview}..."</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${chatUrl}" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">View Message</a>
          </div>

          <p>Reply quickly to keep the conversation going!</p>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>&copy; 2024 Plundora. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  })
};

// Email sending functions
const sendEmail = async (to, template, data = {}) => {
  try {
    const transporter = createTransporter();
    const emailContent = templates[template](...Object.values(data));

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}: ${emailContent.subject}`);
    return result;
  } catch (error) {
    console.error('📧 Email sending failed:', error);
    throw error;
  }
};

// Specific email functions
const sendVerificationEmail = async (email, name, verificationToken) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  return sendEmail(email, 'emailVerification', { name, verificationUrl });
};

const sendPasswordResetEmail = async (email, name, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  return sendEmail(email, 'passwordReset', { name, resetUrl });
};

const sendSaleNotification = async (sellerEmail, buyerName, sellerName, saleTitle, saleId) => {
  const saleUrl = `${process.env.FRONTEND_URL}/sales/${saleId}`;
  return sendEmail(sellerEmail, 'newSale', { buyerName, sellerName, saleTitle, saleUrl });
};

const sendPurchaseConfirmation = async (buyerEmail, buyerName, sellerName, saleTitle, amount, trackingInfo = null) => {
  return sendEmail(buyerEmail, 'purchaseConfirmation', {
    buyerName,
    sellerName,
    saleTitle,
    amount,
    trackingInfo
  });
};

const sendMessageNotification = async (recipientEmail, recipientName, senderName, saleTitle, messagePreview, saleId) => {
  const chatUrl = `${process.env.FRONTEND_URL}/messages/${saleId}`;
  return sendEmail(recipientEmail, 'newMessage', {
    recipientName,
    senderName,
    saleTitle,
    messagePreview,
    chatUrl
  });
};

// Test email configuration
const testEmailConfig = async () => {
  try {
    const transporter = createTransporter();

    if (transporter.sendMail.toString().includes('console.log')) {
      console.log('📧 Email configuration: Development mode (console logging)');
      return { success: true, mode: 'development' };
    }

    await transporter.verify();
    console.log('📧 Email configuration: Production mode (SMTP verified)');
    return { success: true, mode: 'production' };
  } catch (error) {
    console.error('📧 Email configuration test failed:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendSaleNotification,
  sendPurchaseConfirmation,
  sendMessageNotification,
  testEmailConfig
};