import sgMail from '@sendgrid/mail';
import logger from './logger.js';

/**
 * Email Service
 * Handles all email communications (verification, reset password, notifications)
 * Supports both development (console) and production (SendGrid) modes
 */

class EmailService {
  constructor() {
    this.isConfigured = false;
    this.isDevelopment = process.env.NODE_ENV === 'development';

    // Configure SendGrid in production
    if (!this.isDevelopment && process.env.SENDGRID_API_KEY) {
      try {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.isConfigured = true;
        logger.info('SendGrid email service configured');
      } catch (error) {
        logger.warn('Failed to configure SendGrid:', error.message);
      }
    }

    if (this.isDevelopment) {
      logger.info('Email service running in DEVELOPMENT mode (console output)');
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email, name, verificationToken, verificationLink) {
    const subject = 'Verify Your Email - Inventory Management System';
    const html = `
      <h2>Welcome, ${name}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <p style="margin: 20px 0;">
        <a href="${verificationLink}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email
        </a>
      </p>
      <p>Or copy and paste this verification token:</p>
      <code style="background-color: #f5f5f5; padding: 10px; display: block; word-break: break-all; margin: 10px 0;">
        ${verificationToken}
      </code>
      <p style="color: #666; font-size: 12px;">This link will expire in 24 hours.</p>
      <p style="color: #666; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
    `;

    return this._sendEmail(email, subject, html, {
      type: 'verification',
      name,
      email
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, name, resetToken, resetLink) {
    const subject = 'Reset Your Password - Inventory Management System';
    const html = `
      <h2>Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password. Click the link below to proceed:</p>
      <p style="margin: 20px 0;">
        <a href="${resetLink}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this reset token:</p>
      <code style="background-color: #f5f5f5; padding: 10px; display: block; word-break: break-all; margin: 10px 0;">
        ${resetToken}
      </code>
      <p style="color: #666; font-size: 12px;">This link will expire in 1 hour.</p>
      <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email or contact support.</p>
    `;

    return this._sendEmail(email, subject, html, {
      type: 'password-reset',
      name,
      email
    });
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(email, name, role) {
    const subject = 'Welcome to Inventory Management System';
    const html = `
      <h2>Welcome to SYSTEM.CORE, ${name}!</h2>
      <p>Your account has been created with the role: <strong>${role}</strong></p>
      <p>You can now login with your credentials at:</p>
      <p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color: #1976d2;">
          ${process.env.FRONTEND_URL || 'http://localhost:5173'}/login
        </a>
      </p>
      <h3>Role Permissions:</h3>
      ${this._getRoleDescription(role)}
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        If you have any questions, please contact your administrator.
      </p>
    `;

    return this._sendEmail(email, subject, html, {
      type: 'welcome',
      name,
      email,
      role
    });
  }

  /**
   * Send user action notification
   */
  async sendNotificationEmail(email, name, action, details) {
    const subject = `Action Notification - ${action}`;
    const html = `
      <h2>${action}</h2>
      <p>Hi ${name},</p>
      <p>${details}</p>
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        If this wasn't you, please contact support immediately.
      </p>
    `;

    return this._sendEmail(email, subject, html, {
      type: 'notification',
      name,
      email,
      action
    });
  }

  /**
   * Internal method to send email
   */
  async _sendEmail(to, subject, html, metadata = {}) {
    // Development mode: log to console
    if (this.isDevelopment) {
      logger.info(`📧 Email would be sent to: ${to}`);
      logger.info(`   Subject: ${subject}`);
      logger.info(`   Type: ${metadata.type}`);
      return { success: true, mode: 'development', message: 'Email logged to console' };
    }

    // Production mode: send via SendGrid
    if (!this.isConfigured) {
      logger.warn('SendGrid not configured, email not sent:', { to, subject, ...metadata });
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@system.core';
      const msg = {
        to,
        from: fromEmail,
        subject,
        html,
        replyTo: 'support@system.core'
      };

      const result = await sgMail.send(msg);
      logger.info('Email sent successfully', { to, subject, type: metadata.type });
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      logger.error('Failed to send email', {
        to,
        subject,
        error: error.message,
        ...metadata
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Get role description for welcome email
   */
  _getRoleDescription(role) {
    const descriptions = {
      ADMIN: `
        <ul>
          <li>Create and manage all products</li>
          <li>Create and manage all orders</li>
          <li>Manage user accounts and roles</li>
          <li>View system audit logs</li>
          <li>Full system access</li>
        </ul>
      `,
      MANAGER: `
        <ul>
          <li>Create and manage products</li>
          <li>Create and manage orders</li>
          <li>Manage inventory</li>
          <li>View performance reports</li>
        </ul>
      `,
      STAFF: `
        <ul>
          <li>View products and orders</li>
          <li>Create orders</li>
          <li>View assigned tasks</li>
          <li>Limited editing permissions</li>
        </ul>
      `
    };
    return descriptions[role] || descriptions.STAFF;
  }
}

// Export singleton
export default new EmailService();
