import {
  Body,
  Head,
  Html,
  Preview,
} from '@react-email/components';

interface OTPEmailProps {
  code: string;
  title: string;
}

export default function OTPEmail({ code, title }: OTPEmailProps) {
  return (
    <Html>
      <Head>
        <title>{title}</title>
      </Head>
      <Body style={main}>
        <Preview>Xác thực email Nuhoot</Preview>

        <table width="100%" border={0} cellPadding={0} cellSpacing={0} style={outerTable}>
          <tr>
            <td align="center">
              {/* Container */}
              <table width="520" border={0} cellPadding={0} cellSpacing={0} style={container}>
                {/* Header image */}
                <tr>
                  <td>
                    <img
                      src="https://i.postimg.cc/4x0Ycdh7/unnamed-1.png"
                      alt="Nuhoot OTP Cover"
                      width="520"
                      style={{ display: 'block', border: '0' }}
                    />
                  </td>
                </tr>

                {/* Content */}
                <tr>
                  <td style={contentSection}>
                    <h1 style={h1}>Xác thực địa chỉ email của bạn</h1>
                    <p style={mainText}>
                      Vui lòng nhập mã OTP dưới đây để hoàn tất đăng ký tài khoản của bạn:
                    </p>

                    {/* OTP Box */}
                    <table width="100%" border={0} cellPadding={0} cellSpacing={0} style={codeContainer}>
                      <tr>
                        <td align="center">
                          <p style={codeText}>{code}</p>
                        </td>
                      </tr>
                    </table>

                    <p style={validityText}>Mã xác thực sẽ hết hạn sau 10 phút.</p>
                  </td>
                </tr>

                {/* Footer */}
                <tr>
                  <td style={footerSection}>
                    <p style={footerText}>© 2025 Nuhoot - Quiz • Learn • Play</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </Body>
    </Html>
  );
}

OTPEmail.PreviewProps = {
  code: '203044',
  title: 'Nuhoot - Xác thực Email',
} satisfies OTPEmailProps;

// ==== Styles ====

const main = {
  backgroundColor: '#f3f4f6',
  fontFamily: 'Segoe UI, Roboto, sans-serif',
  margin: 0,
  padding: 0,
};

const outerTable = {
  width: '100%',
  backgroundColor: '#f3f4f6',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  overflow: 'hidden',
};

const contentSection = {
  padding: '28px 24px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#1e3a8a',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0 0 16px 0',
};

const mainText = {
  color: '#374151',
  fontSize: '13px',
  margin: '0 0 20px 0',
  lineHeight: '1.5',
};

const codeContainer = {
  backgroundColor: '#eff6ff',
  border: '2px dashed #2563eb',
  borderRadius: '6px',
  marginBottom: '16px',
};

const codeText = {
  fontSize: '32px',
  color: '#1e40af',
  fontWeight: '700',
  letterSpacing: '6px',
  fontFamily: 'monospace',
  margin: '12px 0',
};

const validityText = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '10px 0 0 0',
};

const footerSection = {
  backgroundColor: '#f9fafb',
  padding: '18px 24px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: 0,
};
