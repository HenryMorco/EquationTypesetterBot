# Equation TypeSetter Bot

## What It Is

Telegram: [`@EquationTypesetterBot`](https://t.me/EquationTypesetterBot)

A Telegram Bot that will typeset LaTeX for you and send it back as a PNG file.

Uses mathjax-node to typeset LaTeX into SVG, then passes it to rsvg-convert
binary utility to convert to PNG (which can be sent back thru Telegram).


## How to Host Your Own

### Prerequisites
- AWS Account
- AWS SAM CLI
- Telegram Account (to create bot)

### Steps

1. Clone [this lambda layer](https://github.com/serverlesspub/rsvg-convert-aws-lambda-binary) to your
AWS space.

2. Get a fresh Telegram Bot from [BotFather](https://t.me/botfather).

3. Create a template.yaml based on the sample, fill in the ARN of the RSVG layer
and the Telegram Bot token.

4. Run `npm install` in dependencies/nodejs.

5. Use AWS CLI to deploy your template.yaml:
   
   ```
   sam package --template-file template.yaml --s3-bucket <your-bucket-name> --output-template-file out.yml
   sam deploy --template-file ./out.yml --stack-name <your-stack-name> --capabilities CAPABILITY_IAM
   ```

6. Call Telegram API to [set the
webhook](https://core.telegram.org/bots/api#setwebhook) to the API endpoint that
was created during deployment.


## References

- https://core.telegram.org/bots