<div align="center">
  <a href="https://app.trygloo.com?utm_source=github" target="_blank" rel="noopener noreferrer">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://www.trygloo.com/gloo-ai-square-256.png">
      <img src="https://www.trygloo.com/gloo-ai-square-256.png" height="64">
    </picture>
  </a>
  <h1>Gloo</h1>
  <h2>Open-source LLM-Powered Text Classification <h2>
  <a href="https://discord.gg/dAqqvZEa"><img src="https://img.shields.io/discord/1119368998161752075.svg?logo=discord" /></a>
  <a href="https://twitter.com/intent/follow?screen_name=tryGloo"><img src="https://img.shields.io/twitter/follow/tryGloo?style=social"></a>
  <!-- <a href="https://docs.trygloo.com"><img src="https://img.shields.io/badge/documentation-gloo-brightgreen.svg"></a> -->
  <br />
 • <a href="https://app.trygloo.com">Website (Dashboard)</a> • 
</div>
    
![gloo-classification-demo-lower-fps](https://github.com/GlooHQ/gloo-base/assets/5353992/a3035346-8e00-463f-ba42-6fdd6c051981)

## Introduction

Gloo is an open-source platform that allows you to do NLP tasks like text classification using LLMs to achieve state-of-the-art results -- all with no upfront manual labeling required.

The Gloo platform currently supports Text Classification -- which can be used for auto-labeling large datasets, categorizing customer chat messages, tickets, emails, documents, etc.

## Features

- 📊 **Dashboard:** create and edit classifiers, get stats on predictions, analyze the data.
- **⚡ Gloo API Service** - Make predictions to deployed classifiers via API
- **🧠 Knowledge Distillation Engine** - Reduce LLM costs by > 99% by training tinier classifier models using LLM-predictions with 1 click. This feature is currently only available for Gloo Managed Cloud customers. More details coming soon.

## Roadmap

- 🚧 Entity extraction Endpoint -- define a JSON schema to extract structured data
- 🚧 Test Suites v2.0 -- Get classifier score with vetted test cases. Get alerts, set guardrails when performance drops for a new revision
- 🚧 Compare different configurations for a classifier
- 🚧 1-click train smaller models using LLM data
- 🚧 Deploy endpoints in multiple regions

## Creating your first LLM Classifier

In this tutorial we will setup a Classifier, run predictions via API, and explore the dashboard and analytics.

**Self-Hosting**: To setup the Dashboard and all other services locally, follow this [README](/typescript/README.md) instructions under `typescript/`.

Or just try it out at https://app.trygloo.com.

### Setup your OpenAI / LLM API key

You can use Gloo's key or setup your own if you're self hosting.. Note Gloo's API key may be prone to throttling and is only available for free the first 7 days after signing up.

![add-openai-key](https://github.com/GlooHQ/gloo-base/assets/5353992/7b2b4263-c521-4f79-9c3e-ce473f5e930b)


### Create and configure your classifier

Use the dashboard to create a classifier (programmatic APIs coming soon!) like below:

![create-endpoint](https://github.com/GlooHQ/gloo-base/assets/5353992/84e3a52f-e53a-4781-bf0b-594bc4e85cac)


You will be redirected to the Configurations page, where you can create a new configuration.

![create-config](https://github.com/GlooHQ/gloo-base/assets/5353992/167ff853-0486-4504-94a2-4c208f2bd367)


A Classifier is essentially a pipeline with a sequence of steps you can define.

The most basic pipeline is one with just an LLM-classification step, but you can choose to add pre-processing steps to the input text before it gets classified by the LLM. This can be helpful for translating or summarizing the text (e.g. by a cheaper LLM) before the "Classify with LLM" step runs.

Once you add your classes, you can generate test cases using an LLM, or write your own. From here you can evaluate and check for differences in the results anytime you change your class definitions.

### Prompt Engineering for Classifiers

We've applied the latest research to increase the accuracy of LLM classification, such as adding chain-of-thought / reasoning steps to the prompt, which can yield state-of-the-art accuracy on common classification tasks. [See paper](https://arxiv.org/pdf/2305.08377.pdf).

All you need to do is to define an objective and description about what your classifier will do, and the list of classes and descriptions.

Examples of Classifier objectives:

- This is an `sentiment` classifier for `customer emails`
- This is an `intents` classifier for `customer chat messages`
- This is a `categories` classifier for `financial documents`

Once you iterate on your prompt, save your configuration and "mark it as default". This will effectively make your classifier reachable via an endpoint exposed by Gloo's API service. Currently the endpoints are hosted in AWS US-East-1 on the managed Gloo Cloud service.

## Call your classifier programmatically

Pre-requisites: for now you do have to create an API key, even if you're running Gloo locally. This can be found under the API Keys panel in the sidebar. Make sure to save the whole secret key after creating it.

### Typescript SDK

Install Gloo SDK

```bash
npm install @gloo-ai/client
```

Call the classifier endpoint

```typescript
import { Gloo, GlooClient, GlooEnvironment } from "@gloo-ai/client";

const keyId = "gloo:03ef7d80ba7371ae89629a1823a21..";

const client = new GlooClient({
  environment: GlooEnvironment.Production, // use .Localhost if testing locally
  token: keyId,
});

const classifierId = "ep_6a3418b7...";

const resp = await client.v1.classification.predict(classifierId, {
  text: "Hey I'm trying to sell you my product",
});
```

**Sample Response**

```json
{
  "id": "prediction_3cc0ca6e470d43f4a02a8b3cd77a9787",
  "selectedClasses": [
    {
      "id": "klass_fe1468b61cc64a90adaf0edaef814706",
      "latestVersion": 1,
      "latestName": "sales",
      "overallConfidence": 1
    }
  ],
  "predictorDetails": [
    {
      "type": "llm",
      "tokensUsed": 247,
      "hallucinations": [],
      "reasoning": "The presence of the phrase 'trying to sell' indicates that the email is attempting to sell a product or service.",
      "predictorId": "llmClassifier_befea678bf7f4820a4e167f813613142",
      "latencyMs": 859,
      "predictorType": "LLM",
      "status": "PASS",
      "classes": [
        {
          "klassId": "klass_fe1468b61cc64a90adaf0edaef814706",
          "klassVersion": 1,
          "klassName": "sales",
          "klassDescription": "trying to sell something",
          "confidence": 1,
          "selected": true
        }
      ]
    }
  ]
}
```

Currently all LLM-predictor probabilities will be set as 1.0. We will calculate probabilities in the future via other mechanisms. Stay tuned!

### Python SDK

Install Gloo SDK

```bash
pip install gloo-client
```

```python
coming soon
```

If you aren't getting good results, hop on to our [Discord](https://discord.gg/dAqqvZEa) and we will help with your prompt engineering, or send us an email at mailto:founders@gloo.chat. If Slack works best let us know and we can setup a connection.

### Analytics
After you run some predictions, you can view analytics on the dashboard to explore prediction results in real time, as well as latencies and error rates

![analytics-screenshot-demo1](https://github.com/GlooHQ/gloo-base/assets/5353992/3ac3f11e-7270-4daa-948c-9236bebc94e8)


### Security

Please do not file GitHub issues or post on our public forum for security vulnerabilities, as they are public!

Gloo takes security issues very seriously. If you have any concerns about Gloo or believe you have uncovered a vulnerability, please get in touch via the e-mail address contact@gloo.chat. In the message, try to provide a description of the issue and ideally a way of reproducing it. The security team will get back to you as soon as possible.

Note that this security address should be used only for undisclosed vulnerabilities. Please report any security problems to us before disclosing it publicly.

## Community

- Join us on [Discord](https://discord.gg/dAqqvZEa) - we will share our findings on using LLMs for text classification
