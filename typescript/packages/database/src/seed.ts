import { PrismaClient } from "@prisma/client";

import { uuidGen } from "./parsers";

const prisma = new PrismaClient();

async function main() {
  const classifier1 = await prisma.classifier.create({
    data: {
      id: "classifier1",
      orgId: "org1",
      name: "classifier1",
      klasses: {
        create: [
          {
            id: uuidGen("klass"),
            versions: {
              create: [
                {
                  versionId: 1,
                  name: "dog/questions",
                  description: "questions about dogs",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            },
          },
          {
            id: uuidGen("klass"),
            versions: {
              create: [
                {
                  versionId: 1,
                  name: "createEcsRole/questions",
                  description: "questions about cats",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            },
          },
          {
            id: uuidGen("klass"),
            versions: {
              create: [
                {
                  versionId: 1,
                  name: "horse/questions",
                  description:
                    "Many things related to horses like grooming, etc. The user may own a horse, or have a horse they want to take care of, etc etc etc. Just make sure if it's horse related it's this class.",
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ],
            },
          },
        ],
      },
    },
  });

  // const config1 = await prisma.classifierConfig.create({
  //   // where: { id: "config1" },
  //   data: {
  //     classifier: {
  //       connect: {
  //         id: classifier1.id,
  //       },
  //     },
  //     id: "config1",
  //     createdAt: new Date(),
  //     updatedAt: new Date(),
  //   },
  // });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
