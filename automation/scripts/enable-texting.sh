#!/usr/bin/env bash
# Turn on texting once the 10DLC campaign registration is approved (status COMPLETE).
# Requests a 10DLC number tied to the campaign, turns on two-way SMS into the InboundSms topic,
# writes the number into config.json, and redeploys. Safe to re-run: it reuses a number it already requested.
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE=arthurtrealty
REGION=us-east-2
CAMPAIGN=registration-8f023613e21c4a299b1f96a9cc43c4b9
aws_() { aws "$@" --profile "$PROFILE" --region "$REGION"; }

status=$(aws_ pinpoint-sms-voice-v2 describe-registrations --registration-ids "$CAMPAIGN" --query 'Registrations[0].RegistrationStatus' --output text)
[ "$status" = "COMPLETE" ] || { echo "Campaign is $status, not COMPLETE yet. Nothing changed."; exit 1; }

topic=$(node -e "console.log(require('./cdk-outputs.json').ArthurTRealty.InboundSmsTopicArn)")

number_id=$(aws_ pinpoint-sms-voice-v2 describe-phone-numbers \
  --filters Name=number-type,Values=TEN_DLC --query 'PhoneNumbers[0].PhoneNumberId' --output text)
if [ "$number_id" = "None" ] || [ -z "$number_id" ]; then
  number_id=$(aws_ pinpoint-sms-voice-v2 request-phone-number \
    --iso-country-code US --message-type TRANSACTIONAL --number-capabilities SMS --number-type TEN_DLC \
    --registration-id "$CAMPAIGN" --deletion-protection-enabled \
    --tags Key=Name,Value=arthur-t-realty-texting --query PhoneNumberId --output text)
  echo "Requested number $number_id"
fi

until [ "$(aws_ pinpoint-sms-voice-v2 describe-phone-numbers --phone-number-ids "$number_id" --query 'PhoneNumbers[0].Status' --output text)" = "ACTIVE" ]; do
  echo "Waiting for $number_id to become ACTIVE..."; sleep 20
done

aws_ pinpoint-sms-voice-v2 update-phone-number --phone-number-id "$number_id" \
  --two-way-enabled --two-way-channel-arn "$topic" >/dev/null
arn=$(aws_ pinpoint-sms-voice-v2 describe-phone-numbers --phone-number-ids "$number_id" --query 'PhoneNumbers[0].PhoneNumberArn' --output text)
phone=$(aws_ pinpoint-sms-voice-v2 describe-phone-numbers --phone-number-ids "$number_id" --query 'PhoneNumbers[0].PhoneNumber' --output text)

node -e "
const fs = require('fs'); const s = fs.readFileSync('config.json', 'utf8');
const out = s.replace(/(\"originationIdentity\":\s*)\"[^\"]*\"/, (_, k) => k + JSON.stringify(process.argv[1]));
if (JSON.parse(out).sms.originationIdentity !== process.argv[1]) throw new Error('config.json not updated');
fs.writeFileSync('config.json', out);" "$arn"

npx cdk deploy --all --profile "$PROFILE" --require-approval never --outputs-file cdk-outputs.json
echo "Texting is on from $phone ($arn). The monthly SMS spend limit is still \$1 until AWS raises it."
