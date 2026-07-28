// =========================================================================
// FS HUB UNIVERSAL AUTOMATED EMAIL ENGINE (`_EmailService.js`)
// Adds a local failed-email queue so reps can retry specific failed emails.
// =========================================================================

import AsyncStorage from '@react-native-async-storage/async-storage';

export const EmailService = {
  config: {
    apiUrl: 'https://api.emailjs.com/api/v1.0/email/send',
    serviceId: 'service_o89e4yr',
    publicKey: 'Syi9XouDR61AOJfsy',
    privateKey: 'xpxhAItngFGqWNUQQMn6n',
    templateIdWelcome: 'template_8n51eqx',
    templateIdOrder:   'template_8n51eqx',
    senderEmail: 'no-reply@fshub.ng',
  },

  KEYS: {
    FAILED_EMAILS: '@fshub_failed_emails_queue',
  },

  getFailedEmails: async function() {
    try {
      const raw = await AsyncStorage.getItem(this.KEYS.FAILED_EMAILS);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  _setFailedEmails: async function(items) {
    const safeItems = Array.isArray(items) ? items : [];
    await AsyncStorage.setItem(this.KEYS.FAILED_EMAILS, JSON.stringify(safeItems));
    return safeItems;
  },

  saveFailedEmail: async function(record) {
    try {
      if (!record?.toEmail || !record?.subject || !record?.message) return { success: false };
      const current = await this.getFailedEmails();
      const id = record.id || `EMAIL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const next = [
        {
          id,
          toEmail: record.toEmail,
          toName: record.toName || 'FS Hub User',
          subject: record.subject,
          message: record.message,
          kind: record.kind || 'email',
          relatedId: record.relatedId || '',
          lastError: record.lastError || 'Email failed to send',
          createdAt: record.createdAt || new Date().toISOString(),
          retryCount: record.retryCount || 0,
        },
        ...current.filter(item => item.id !== id)
      ];
      await this._setFailedEmails(next.slice(0, 50));
      return { success: true, id };
    } catch (e) {
      console.log('[FailedEmailQueue Save Error]', e.message);
      return { success: false, error: e.message };
    }
  },

  removeFailedEmail: async function(id) {
    const current = await this.getFailedEmails();
    const next = current.filter(item => item.id !== id);
    await this._setFailedEmails(next);
    return { success: true, emails: next };
  },

  retryFailedEmail: async function(id) {
    const current = await this.getFailedEmails();
    const item = current.find(record => record.id === id);
    if (!item) return { success: false, message: 'Failed email record not found.' };

    const result = await this._sendRawEmail(item.toEmail, item.subject, item.message, item.toName, { skipQueue: true });
    if (result.success) {
      await this.removeFailedEmail(id);
      return { success: true, message: 'Email resent successfully.' };
    }

    const next = current.map(record => record.id === id ? {
      ...record,
      lastError: result.message || 'Retry failed',
      retryCount: (record.retryCount || 0) + 1,
      lastTriedAt: new Date().toISOString(),
    } : record);
    await this._setFailedEmails(next);
    return { success: false, message: result.message || 'Retry failed.' };
  },

  sendWelcomeEmail: async function({ storeName, ownerName, storeEmail, businessType, creditLimit, visitDay }) {
    const welcomeBodyText =
      `Hello ${ownerName || 'Store Manager'},\n\n` +
      `We are excited to confirm that "${storeName}" has been successfully registered and geotagged inside our official FS Hub Field Sales Directory (${businessType}).\n\n` +
      `----------------------------------------\n` +
      `CLIENT ONBOARDING PROFILE:\n` +
      `Store Name: ${storeName}\n` +
      `Registered Gmail: ${storeEmail.trim()}\n` +
      `Assigned SFA Credit Limit: ₦${creditLimit}\n` +
      `Preferred Visit Schedule: ${visitDay}\n` +
      `----------------------------------------\n\n` +
      `Our assigned field sales officer will visit your store according to your preferred schedule to check stock levels and process orders.\n\n` +
      `Thank you for partnering with FS Hub!`;

    return this._sendRawEmail(
      storeEmail.trim(),
      `Welcome to FS Hub Directory - ${storeName}`,
      welcomeBodyText,
      ownerName || 'Store Manager',
      { kind: 'client_welcome', relatedId: storeName }
    );
  },

  sendOrderReceiptEmail: async function({ clientName, clientEmail, invoiceNumber, cartItems, grandTotal, discountAmount, payableTotal, paymentCycle, deliveryUrgency }) {
    const formattedItemsList = (cartItems || []).map((item, idx) =>
      `${idx + 1}. ${item.name} | Qty: ${item.qty} | Subtotal: ₦${((item.qty || 0) * (item.price || 0)).toLocaleString()}`
    ).join('\n');

    const orderBodyText =
      `Hello ${clientName}!\n\n` +
      `Here is your official itemized order confirmation receipt from FS Hub (#${invoiceNumber}):\n\n` +
      `--------------------------------------------------\n` +
      `LINE-BY-LINE ORDER CHECKLIST:\n` +
      `${formattedItemsList}\n` +
      `--------------------------------------------------\n` +
      `Subtotal Volume: ₦${Number(grandTotal || 0).toLocaleString()}\n` +
      `Trade Promotion Discount: -₦${Number(discountAmount || 0).toLocaleString()}\n` +
      `--------------------------------------------------\n` +
      `FINAL PAYABLE TOTAL: ₦${Number(payableTotal || 0).toLocaleString()}\n` +
      `Assigned Payment Term: ${paymentCycle}\n` +
      `Requested Delivery Dispatch: ${deliveryUrgency}\n` +
      `--------------------------------------------------\n\n` +
      `Thank you for your business!`;

    return this._sendRawEmail(
      clientEmail.trim(),
      `Order Confirmation #${invoiceNumber} - FS Hub`,
      orderBodyText,
      clientName,
      { kind: 'order_receipt', relatedId: invoiceNumber }
    );
  },

  sendOtpResetEmail: async function({ toEmail, otpCode, repId }) {
    const otpBodyText =
      `Hello Officer (${repId || 'Field Agent'}),\n\n` +
      `Your FS Hub reset code is:\n\n` +
      `🔐  ${otpCode}  🔐\n\n` +
      `This verification code expires in 15 minutes.`;

    return this._sendRawEmail(
      toEmail.trim(),
      `FS Hub Security: Your Password Reset OTP (${otpCode})`,
      otpBodyText,
      repId || 'Field Agent',
      { kind: 'password_otp', relatedId: repId }
    );
  },

  sendAgentWelcomeEmail: async function({ agentName, repId, territory, toEmail }) {
    const agentWelcomeText =
      `Hello Officer ${agentName}!\n\n` +
      `Congratulations! Your mobile device has been successfully registered and authenticated on the official FS Hub Field Sales Portal.\n\n` +
      `----------------------------------------\n` +
      `Officer Name: ${agentName}\n` +
      `Assigned Rep ID: ${repId}\n` +
      `Assigned Territory / Zone: ${territory}\n` +
      `Registered Gmail: ${toEmail.trim()}\n` +
      `----------------------------------------\n\n` +
      `Welcome to the FS Hub team!`;

    return this._sendRawEmail(
      toEmail.trim(),
      `Officer Onboarding Confirmed: Welcome to FS Hub (${repId})`,
      agentWelcomeText,
      agentName,
      { kind: 'agent_welcome', relatedId: repId }
    );
  },

  _sendRawEmail: async function(toEmail, subject, message, toName, options = {}) {
    const emailPayload = {
      service_id:  this.config.serviceId,
      template_id: this.config.templateIdWelcome,
      user_id:     this.config.publicKey,
      accessToken: this.config.privateKey,
      template_params: {
        to_email: toEmail,
        to_name:  toName || 'FS Hub User',
        subject:  subject,
        message:  message,
      }
    };

    try {
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`EmailJS Error (${response.status}): ${errText || response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('[EmailService Error]:', error);
      if (!options.skipQueue) {
        await this.saveFailedEmail({
          toEmail,
          toName,
          subject,
          message,
          kind: options.kind,
          relatedId: options.relatedId,
          lastError: error.message,
        });
      }
      return { success: false, message: error.message };
    }
  }
};

export default EmailService;
