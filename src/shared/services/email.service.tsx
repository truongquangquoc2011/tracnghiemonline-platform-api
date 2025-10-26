import { Injectable, Logger } from '@nestjs/common';
import * as sgMail from '@sendgrid/mail';
import * as ReactDOMServer from 'react-dom/server';
import OTPEmail from 'emails/otp';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async sendOTPEmail(payload: { email: string; code: string }) {
    const subject = 'Xác thực email - NuHoot';
    const html = ReactDOMServer.renderToStaticMarkup(
      <OTPEmail code={payload.code} title={subject} />,
    );

    const msg = {
      to: payload.email,
      from: process.env.MAIL_FROM!,
      subject,
      html,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`✅ OTP email sent to ${payload.email}`);
      return { message: 'Sent via SendGrid' };
    } catch (err) {
      this.logger.error('❌ SendGrid send error:', err.response?.body || err);
      throw new Error('MAIL_SEND_FAILED');
    }
  }
}
