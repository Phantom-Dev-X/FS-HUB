// =========================================================================
// FS HUB UNIVERSAL AUTOMATED EMAIL ENGINE (`_EmailService.js`) — 100% WARNING FREE
// Look: Added `export default EmailService` at the bottom to stop Expo Router warnings!
// =========================================================================

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

    return this._sendRawEmail(storeEmail.trim(), `Welcome to FS Hub Directory - ${storeName}`, welcomeBodyText, ownerName || 'Store Manager');
  },

  sendOrderReceiptEmail: async function({ clientName, clientEmail, invoiceNumber, cartItems, grandTotal, discountAmount, payableTotal, paymentCycle, deliveryUrgency }) {
    const formattedItemsList = cartItems.map((item, idx) => 
      `${idx + 1}. ${item.name} | Qty: ${item.qty} | Subtotal: ₦${(item.qty * item.price).toLocaleString()}`
    ).join('\n');

    const orderBodyText = 
      `Hello ${clientName}!\n\n` +
      `Here is your official itemized order confirmation receipt from FS Hub (#${invoiceNumber}):\n\n` +
      `--------------------------------------------------\n` +
      `LINE-BY-LINE ORDER CHECKLIST:\n` +
      `${formattedItemsList}\n` +
      `--------------------------------------------------\n` +
      `Subtotal Volume: ₦${grandTotal.toLocaleString()}\n` +
      `Trade Promotion Discount: -₦${discountAmount.toLocaleString()}\n` +
      `--------------------------------------------------\n` +
      `FINAL PAYABLE TOTAL: ₦${payableTotal.toLocaleString()}\n` +
      `Assigned Payment Term: ${paymentCycle}\n` +
      `Requested Delivery Dispatch: ${deliveryUrgency}\n` +
      `--------------------------------------------------\n\n` +
      `Your order check-in photo and GPS coordinates have been verified by our field officer and logged right into our central Ikeja Depot queue.\n\n` +
      `Thank you for your business!`;

    return this._sendRawEmail(clientEmail.trim(), `Order Confirmation #${invoiceNumber} - FS Hub`, orderBodyText, clientName);
  },

  sendOtpResetEmail: async function({ toEmail, otpCode, repId }) {
    console.log(`[EmailService] Initiating 6-digit OTP reset code (${otpCode}) to: ${toEmail}`);

    const otpBodyText = 
      `Hello Officer (${repId || 'Field Agent'}),\n\n` +
      `You requested a secure password reset for your FS Hub SFA Mobile Portal access.\n\n` +
      `Your 6-Digit One-Time Password (OTP) verification code is:\n\n` +
      `🔐  ${otpCode}  🔐\n\n` +
      `This verification code expires in 15 minutes. Enter this exact 6-digit code into your FS Hub app screen right now along with your new secret password to unlock your account.\n\n` +
      `If you did not request this password reset, please notify Ikeja Headquarters security immediately.`;

    return this._sendRawEmail(toEmail.trim(), `FS Hub Security: Your 6-Digit Password Reset OTP (${otpCode})`, otpBodyText, repId || 'Field Agent');
  },

  sendAgentWelcomeEmail: async function({ agentName, repId, territory, toEmail }) {
    console.log(`[EmailService] Initiating new officer onboarding welcome email to: ${toEmail}`);

    const agentWelcomeText = 
      `Hello Officer ${agentName}!\n\n` +
      `Congratulations! Your mobile device has been successfully registered and authenticated on the official FS Hub Field Sales Portal.\n\n` +
      `----------------------------------------\n` +
      `OFFICER CREDENTIALS SUMMARY:\n` +
      `Officer Name: ${agentName}\n` +
      `Assigned Rep ID: ${repId}\n` +
      `Assigned Territory / Zone: ${territory}\n` +
      `Registered Gmail: ${toEmail.trim()}\n` +
      `----------------------------------------\n\n` +
      `You now have full SFA access to log geotagged store check-ins, place client orders, track monthly commission targets, and manage offline data across your territory.\n\n` +
      `Welcome to the FS Hub team!`;

    return this._sendRawEmail(toEmail.trim(), `Officer Onboarding Confirmed: Welcome to FS Hub (${repId})`, agentWelcomeText, agentName);
  },

  _sendRawEmail: async function(toEmail, subject, message, toName) {
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
      return { success: false, message: error.message };
    }
  }
};

// ⚠️ THE EXACT 1-LINE FIX THAT STOPS EXPO ROUTER YELLOW WARNINGS:
export default EmailService;
