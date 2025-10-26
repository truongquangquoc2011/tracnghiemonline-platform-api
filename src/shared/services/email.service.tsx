import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail'; // ✅ import default
import { envConfig } from '../config';
import OTPEmail from 'emails/otp';
import * as ReactDOMServer from 'react-dom/server';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor() {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        this.logger.error(
          '❌ Missing SENDGRID_API_KEY in environment variables',
        );
      } else {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.logger.log('✅ SendGrid initialized successfully');
      }
    } catch (err) {
      this.logger.error('❌ Failed to initialize SendGrid:', err);
    }
  }

  /**
   * Sends an OTP (One-Time Password) email to the specified address
   * @param payload Object containing recipient email and OTP code
   * @returns The response information from SendGrid
   */
  async sendOTPEmail(payload: { email: string; code: string }) {
    const subject = 'Xác thực email - NuHoot';

    // render React email component thành HTML
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <OTPEmail code={payload.code} title={subject} />,
    );

    const msg = {
      to: payload.email,
      from: process.env.MAIL_FROM || envConfig.otpEmail, // ví dụ: no.reply.codearena@gmail.com (đã verify)
      subject,
      html: htmlContent,
    };

    try {
      const [response] = await sgMail.send(msg);
      this.logger.log(
        `✅ OTP email sent to ${payload.email}, status: ${response.statusCode}`,
      );
      return { message: 'Sent via SendGrid' };
    } catch (err: any) {
      this.logger.error(
        '❌ SendGrid send error:',
        err.response?.body || err.message,
      );
      throw new Error('MAIL_SEND_FAILED');
    }
  }
}
