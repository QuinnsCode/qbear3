// @/lib/email/templates/passwordReset.ts

export function getPasswordResetEmailHTML(resetUrl: string): string {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="color-scheme" content="light dark" />
      <meta name="supported-color-schemes" content="light dark" />
      <title></title>
      <style type="text/css" rel="stylesheet" media="all">
      /* Base ------------------------------ */
      @import url("https://fonts.googleapis.com/css?family=Nunito+Sans:400,700&display=swap");
      body {
        width: 100% !important;
        height: 100%;
        margin: 0;
        -webkit-text-size-adjust: none;
      }
      a {
        color: white;
      }
      a:hover {
        color: white;
      }
      a img {
        border: none;
      }
      td {
        word-break: break-word;
      }
      .preheader {
        display: none !important;
        visibility: hidden;
        mso-hide: all;
        font-size: 1px;
        line-height: 1px;
        max-height: 0;
        max-width: 0;
        opacity: 0;
        overflow: hidden;
      }
      /* Type ------------------------------ */
      body,
      td,
      th {
        font-family: "Nunito Sans", Helvetica, Arial, sans-serif;
      }
      h1 {
        margin-top: 0;
        color: #333333;
        font-size: 22px;
        font-weight: bold;
        text-align: left;
      }
      h2 {
        margin-top: 0;
        color: #333333;
        font-size: 16px;
        font-weight: bold;
        text-align: left;
      }
      h3 {
        margin-top: 0;
        color: #333333;
        font-size: 14px;
        font-weight: bold;
        text-align: left;
      }
      td,
      th {
        font-size: 16px;
      }
      p,
      ul,
      ol,
      blockquote {
        margin: .4em 0 1.1875em;
        font-size: 16px;
        line-height: 1.625;
      }
      p.sub {
        font-size: 13px;
      }
      /* Utilities ------------------------------ */
      .align-right {
        text-align: right;
      }
      .align-left {
        text-align: left;
      }
      .align-center {
        text-align: center;
      }
      .u-margin-bottom-none {
        margin-bottom: 0;
      }
      /* Buttons ------------------------------ */
      .button {
        background-color: #d97706;
        border-top: 10px solid #d97706;
        border-right: 18px solid #d97706;
        border-bottom: 10px solid #d97706;
        border-left: 18px solid #d97706;
        display: inline-block;
        color: #FFF;
        text-decoration: none;
        border-radius: 3px;
        box-shadow: 0 2px 3px rgba(0, 0, 0, 0.16);
        -webkit-text-size-adjust: none;
        box-sizing: border-box;
      }
      .button:hover {
        background-color: #b45309;
        border-top: 10px solid #b45309;
        border-right: 18px solid #b45309;
        border-bottom: 10px solid #b45309;
        border-left: 18px solid #b45309;
      }
      @media only screen and (max-width: 500px) {
        .button {
          width: 100% !important;
          text-align: center !important;
        }
      }
      body {
        background-color: #1e293b;
        color: #e2e8f0;
      }
      p {
        color: #e2e8f0;
      }
      .email-wrapper {
        width: 100%;
        margin: 0;
        padding: 0;
        background-color: #1e293b;
      }
      .email-masthead {
        padding: 25px 0;
        text-align: center;
      }
      .email-masthead_name {
        font-size: 20px;
        font-weight: bold;
        color: #fbbf24;
        text-decoration: none;
      }
      .email-body_inner {
        width: 570px;
        margin: 0 auto;
        padding: 0;
        background-color: #334155;
      }
      .email-footer {
        width: 570px;
        margin: 0 auto;
        padding: 0;
        text-align: center;
      }
      .email-footer p {
        color: #94a3b8;
      }
      .body-action {
        width: 100%;
        margin: 30px auto;
        padding: 0;
        text-align: center;
      }
      .body-sub {
        margin-top: 25px;
        padding-top: 25px;
        border-top: 1px solid #475569;
      }
      .content-cell {
        padding: 45px;
      }
      @media only screen and (max-width: 600px) {
        .email-body_inner,
        .email-footer {
          width: 100% !important;
        }
      }
      @media (prefers-color-scheme: dark) {
        h1, h2, h3 {
          color: #fbbf24 !important;
        }
      }
      </style>
    </head>
    <body>
      <span class="preheader">Use this link to reset your password. The link is only valid for 1 hour.</span>
      <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center">
            <table class="email-content" width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td class="email-masthead">
                  <a href="https://qntbr.com" class="email-masthead_name">
                    Q N T B R
                  </a>
                </td>
              </tr>
              <tr>
                <td class="email-body" width="570" cellpadding="0" cellspacing="0">
                  <table class="email-body_inner" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td class="content-cell">
                        <div>
                          <h1>Hello adventurer,</h1>
                          <p>You recently requested to reset your password for your QNTBR account. Use the button below to reset it. <strong>This password reset is only valid for the next 1 hour.</strong></p>
                          
                          <table class="body-action" align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                              <td align="center">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                                  <tr>
                                    <td align="center">
                                      <a href="${resetUrl}" class="button" target="_blank">🔑 Reset your password</a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
  
                          <p>If you did not request a password reset, please ignore this email or contact us if you have questions.</p>
                          <p>May your draws be legendary,<br>The QNTBR team</p>
                          
                          <table class="body-sub" role="presentation">
                            <tr>
                              <td>
                                <p class="sub">If you're having trouble with the button above, copy and paste the URL below into your web browser.</p>
                                <p class="sub">${resetUrl}</p>
                              </td>
                            </tr>
                          </table>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td>
                  <table class="email-footer" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td class="content-cell" align="center">
                        <p class="sub align-center">
                          QNTBR - Virtual Tabletop for Trading Card Games
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
  }