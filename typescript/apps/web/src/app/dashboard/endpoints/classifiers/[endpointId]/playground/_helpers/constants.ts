// interface PreviousInputs

export const loremIpsum =
  "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived \nnot only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset\n sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.";

export const rephrasedPrompt = `You are a user who spoke with an agent.

  paraphrase the last "user" message to what the user is actually asking, unless the user is only thanking, then don't paraphrase. 
  
  Rules:
  - use first person
  - do not keep any names of the user
  - the paraphrased message should stand alone
  - if the "user" is upset, match the same tone of voice`;
