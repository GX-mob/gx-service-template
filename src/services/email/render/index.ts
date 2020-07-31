/**
 * Email renderer
 *
 * @group unit/service
 */
import { join } from "path";
import { readFileSync } from "fs";
import { minify } from "html-minifier";
import marked from "marked";

const styles = readFileSync(join(__dirname, "style.css"));

export const render = (title: string, content: string, preHeader?) =>
  minify(
    `<!doctype html>
<html>
  <head>
  <meta name="viewport" content="width=device-width" />
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${title}</title>
  <style>
  ${styles}
  </style>
  </head>
  <body class="">
    ${
      preHeader
        ? `<span class="preheader"
    >${preHeader}</span
  >`
        : ""
    }
    <table
      role="presentation"
      border="0"
      cellpadding="0"
      cellspacing="0"
      class="body"
    >
      <tr>
        <td>&nbsp;</td>
        <td class="container">
          <div class="content">
            <!-- START CENTERED WHITE CONTAINER -->
            <table role="presentation" class="main">
              <!-- START MAIN CONTENT AREA -->
              <tr>
                <td class="wrapper">
                  ${marked(content)}
                </td>
              </tr>

              <!-- END MAIN CONTENT AREA -->
            </table>
            <!-- END CENTERED WHITE CONTAINER -->
            <!-- START FOOTER -->
            <div class="footer">
              <table
                role="presentation"
                border="0"
                cellpadding="0"
                cellspacing="0"
              >
                <tr>
                  <td class="content-block">
                    <span class="apple-link"
                      >Company Inc, 3 Abbey Road, San Francisco CA 94102</span
                    >
                  </td>
                </tr>
                <tr>
                  <td class="content-block powered-by">
                    <a href="http://htmlemail.io">GX</a> 2020.
                  </td>
                </tr>
              </table>
            </div>
            <!-- END FOOTER -->
          </div>
        </td>
        <td>&nbsp;</td>
      </tr>
    </table>
  </body>
</html>
`,
    { collapseWhitespace: true, minifyCSS: true, minifyJS: true }
  );

export default render;
