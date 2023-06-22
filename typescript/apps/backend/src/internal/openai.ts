import { Configuration, OpenAIApi } from "openai";

import config from "../config";

const configuration = new Configuration({
  apiKey: config.OPENAI_KEY,
});
export const openaiClient = new OpenAIApi(configuration);
