#!/usr/bin/env python3
"""ShadowNet Stage 5 HTTP client. Implement prediction logic yourself."""
import argparse
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# Recovered NexaCorp engineering note (challenge information, not the solution):
# state_next = (1103515245 * state + 12345) % (2 ** 31)
# token = state_next % 100000000, formatted as eight decimal digits.
# The timestamp seed and internal states are not supplied. Samples are consecutive.
# Recover a compatible internal state, then predict the token after the last sample.


def predict_next(tokens):
    # TODO: recover the generator's internal state from the truncated samples.
    # Return the next token as an eight-digit string (preserve leading zeroes).
    raise NotImplementedError('Implement predict_next(tokens), or pass --prediction for a manual attempt.')


def main():
    parser = argparse.ArgumentParser(description='Submit a Stage 5 token prediction over HTTPS.')
    parser.add_argument('--challenge', default='stage5-challenge.json', help='Downloaded challenge JSON file')
    parser.add_argument('--prediction', help='Optional manually calculated eight-digit prediction')
    args = parser.parse_args()
    challenge = json.loads(Path(args.challenge).read_text())
    endpoint = challenge['predictUrl']
    parsed = urllib.parse.urlsplit(endpoint)
    if parsed.scheme not in ('https', 'http') or not parsed.hostname:
        raise SystemExit('Invalid challenge API URL.')
    if parsed.scheme != 'https' and parsed.hostname not in ('localhost', '127.0.0.1', '::1'):
        raise SystemExit('Use HTTPS for hosted challenges; HTTP is allowed only for localhost testing.')
    print('Observed tokens:', ', '.join(challenge['tokens']))
    try:
        prediction = args.prediction or predict_next(challenge['tokens'])
    except NotImplementedError as error:
        raise SystemExit(str(error)) from None
    if not isinstance(prediction, str) or len(prediction) != 8 or not prediction.isascii() or not prediction.isdigit():
        raise SystemExit('Prediction must be an eight-digit string.')
    request = urllib.request.Request(endpoint, data=json.dumps({
        'session': challenge['session'], 'prediction': prediction,
    }).encode(), headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        try: message = json.load(error).get('error', str(error))
        except (ValueError, AttributeError): message = str(error)
        raise SystemExit(message) from None
    except urllib.error.URLError as error:
        raise SystemExit(f'Cannot reach the challenge API: {error.reason}') from None
    if 'flag' not in result:
        raise SystemExit('Unexpected API response.')
    print('Prediction accepted. Flag:', result['flag'])
    print('Submit this flag in the main dashboard.')


if __name__ == '__main__':
    main()
