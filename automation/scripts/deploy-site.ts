/**
 * Uploads the exported website (../out) to Amplify Hosting, with a /config.json that points the
 * quiz, forms and staff dashboard at the deployed API and staff login.
 * Run after `cdk deploy --outputs-file cdk-outputs.json` (npm run deploy does both).
 */
import { AmplifyClient, CreateDeploymentCommand, GetJobCommand, StartDeploymentCommand } from '@aws-sdk/client-amplify';
import AdmZip from 'adm-zip';
import * as fs from 'node:fs';
import * as path from 'node:path';

process.env.AWS_PROFILE ??= 'arthurtrealty';
const REGION = 'us-east-2';
const BRANCH = 'main';

const outputsFile = path.join(__dirname, '../cdk-outputs.json');
const siteDir = path.join(__dirname, '../../out');

function readOutputs(): Record<string, string> {
  if (!fs.existsSync(outputsFile)) throw new Error(`${outputsFile} not found. Run "npm run deploy" first.`);
  return JSON.parse(fs.readFileSync(outputsFile, 'utf8')).ArthurTRealty;
}

function zipSite(): Buffer {
  if (!fs.existsSync(path.join(siteDir, 'index.html'))) throw new Error(`No website build at ${siteDir}. Run "npm run build" in the project root.`);
  const zip = new AdmZip();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      // Amplify needs forward-slash paths inside the zip, even on Windows.
      else zip.addFile(path.relative(siteDir, full).split(path.sep).join('/'), fs.readFileSync(full));
    }
  };
  walk(siteDir);
  return zip.toBuffer();
}

async function main() {
  const out = readOutputs();
  const config = {
    apiUrl: out.ApiUrl.replace(/\/$/, ''),
    region: REGION,
    staffLogin: { domain: out.StaffLoginDomain, clientId: out.StaffLoginClientId },
  };
  fs.writeFileSync(path.join(siteDir, 'config.json'), JSON.stringify(config));

  const body = zipSite();
  const amplify = new AmplifyClient({ region: REGION });
  const appId = out.AmplifyAppId;

  const { jobId, zipUploadUrl } = await amplify.send(new CreateDeploymentCommand({ appId, branchName: BRANCH }));
  const upload = await fetch(zipUploadUrl!, { method: 'PUT', body: new Uint8Array(body) });
  if (!upload.ok) throw new Error(`Upload failed: ${upload.status} ${await upload.text()}`);
  await amplify.send(new StartDeploymentCommand({ appId, branchName: BRANCH, jobId }));
  console.log(`Uploaded ${(body.length / 1024 / 1024).toFixed(1)} MB, deployment job ${jobId} started`);

  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    const { job } = await amplify.send(new GetJobCommand({ appId, branchName: BRANCH, jobId }));
    const status = job?.summary?.status;
    if (status === 'SUCCEED') break;
    if (status === 'FAILED' || status === 'CANCELLED') throw new Error(`Amplify deployment ${status}`);
  }
  console.log(`Website live at ${out.SiteUrl}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
