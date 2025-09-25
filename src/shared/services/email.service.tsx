import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { envConfig } from '../config';
import OTPEmail from 'emails/otp';
import * as ReactDOMServer from 'react-dom/server';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: envConfig.emailHost,
      port: envConfig.emailPort,
      secure: true,
      auth: {
        user: envConfig.otpEmail,
        pass: envConfig.otpEmailPassword,
      },
    });
  }

  /**
 * Sends an OTP (One-Time Password) email to the specified address
 * @param payload Object containing recipient email and OTP code
 * @returns The response information from Nodemailer
 */
  async sendOTPEmail(payload: { email: string; code: string }) {
    const subject = 'Xác thực email - NuHoot';
    const htmlContent = ReactDOMServer.renderToStaticMarkup(
      <OTPEmail code={payload.code} title={subject} />
    );
    const info = await this.transporter.sendMail({
      from: `"NuHoot" <${envConfig.otpEmail}>`,
      to: payload.email,
      subject,
      html: htmlContent,
    });

    return info;
  }
}
