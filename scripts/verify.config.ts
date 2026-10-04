/**
 * What `pnpm verify` needs to know about this project that it cannot discover from `app/`. Edit it; verify reads it.
 */
export type VerifyConfig = {
  /**
   * Detail pages checked beside every static route, one per state worth seeing (a normal record, a failed one, a missing
   * one). `pnpm verify --extra a,b` replaces them for one run.
   */
  detailRoutes: string[];
  /**
   * For a product whose pages read and write a live API. verify presses every control it finds, Approve, Revoke and
   * Delete included, so those presses must reach a fake, never production. `script` starts a server on `--port 0` that
   * answers every route the pages call (writes answer success and are forgotten) and prints `listening on <url>`; verify
   * starts it first and builds and serves the app with the environment variable `env` set to that URL. Leave it out only
   * when the pages read nothing but local data, as this sample does.
   */
  fakeApi?: { script: string; env: string };
  /**
   * In a project that adopted Meridian (zz-meridian adopt), verify refuses to run until it knows its presses cannot
   * reach a live backend: name a `fakeApi`, or set this to true when the pages read and write nothing outside this
   * repository (local files, fixtures). Never set it to make verify run against an API.
   */
  noLiveApi?: true;
  /**
   * The product's own browser checks, beside Meridian's audit, presses and keyboard walk: scripts verify runs with
   * `--base <url>` against the built app, failing when one exits non-zero.
   */
  browserChecks?: string[];
};

const config: VerifyConfig = {
  // Ids from the sample (src/system/fixtures/sample.ts); tests/sample.test.ts fails if one stops being what it says.
  detailRoutes: [
    '/requests/req_qmi1vbyi3uqt', // GET, 200: no request body, no model
    '/requests/req_jqwm3le188pi', // POST /v1/messages, 201: model, tokens and a streamed response
    '/requests/req_p2r91aiimd17', // 404: the refused state
    '/requests/req_missing', // no such request: the not-found screen in the shell
  ],
};

export default config;
