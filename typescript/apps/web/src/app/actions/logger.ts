/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import winston from "winston";
import chalk from "chalk";

const colorizer = winston.format.colorize();

const objectToLogString = (obj: object, indent: string) => {
  return Object.entries(obj)
    .map(([k, v]): string => {
      if (typeof v === "object") {
        return `${indent}${chalk.gray(k)}:\n${objectToLogString(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          v,
          indent + "  "
        )}`;
      }
      return `${indent}${chalk.gray(k)}: ${v}`;
    })
    .join("\n");
};

const defaultFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.label({ label: "NEXTJS" }),
  winston.format.printf((info) => {
    const { timestamp, level, message } = info;
    const formattedTimestamp = chalk.gray(`[${timestamp}]`);
    const formattedLevel = colorizer.colorize(level, level.toLowerCase());
    const label = info.label ? chalk.gray(` [${info.label}]`) : "";
    const out = `${formattedTimestamp}${label} ${formattedLevel}: ${message}`;
    const meta = Object.entries(info)
      .map(([k, v]) => {
        if (!["timestamp", "level", "message", "label"].includes(k)) {
          if (v && typeof v === "object") {
            return `  ${chalk.gray(k)}:\n${objectToLogString(v, "    ")}`;
          }
          // If the object has a toString method, use that
          if (v && typeof v === "object" && v.toString) {
            return `  ${chalk.gray(k)}: ${v.toString()}`;
          }
          return `  ${chalk.gray(k)}: ${v}`;
        }
        return null;
      })
      .filter((v) => v !== null)
      .join("\n");
    if (meta) {
      // Add metadata on a new line with json formatting, indented by two spaces
      return `${out}\n${meta}`;
    }
    return out;
  })
);

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { meta: null },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      level: "debug",
      format: defaultFormat,
    })
  );
}

export const setLogLevel = (level: string) => {
  logger.transports.forEach((t) => {
    if (t instanceof winston.transports.Console) {
      t.level = level;
    }
  });
};

export default logger;
