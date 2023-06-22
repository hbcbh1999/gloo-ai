import type { Logger } from "winston";
import { format, createLogger, transports } from "winston";
import chalk from "chalk";

const colorizer = format.colorize();

const objectToLogString = (obj: object, indent: string) => {
  return Object.entries(obj)
    .map(([k, v]): string => {
      if (typeof v === "object") {
        return `${indent}${chalk.gray(k)}:\n${objectToLogString(
          v,
          indent + "  "
        )}`;
      }
      return `${indent}${chalk.gray(k)}: ${v}`;
    })
    .join("\n");
};

const defaultFormat = format.combine(
  format.timestamp(),
  format.json(),
  format.label({ label: "PRISMA" }),
  format.printf((info) => {
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

const loggers = new Map<string, Logger>();

const makeLogger = (label: string, level: string): Logger => {
  if (loggers.has(label)) {
    return loggers.get(label)!;
  }

  const l = createLogger({
    level: "info",
    format: format.combine(format.timestamp(), format.json()),
    defaultMeta: { meta: null },
    transports: [
      //
      // - Write all logs with importance level of `error` or less to `error.log`
      // - Write all logs with importance level of `info` or less to `combined.log`
      //
      new transports.File({ filename: "error.log", level: "error" }),
      new transports.File({ filename: "combined.log" }),
    ],
  });

  if (process.env.NODE_ENV !== "production") {
    l.add(
      new transports.Console({
        level,
        format: defaultFormat,
      })
    );
  }

  loggers.set(label, l);
  return l;
};

export { makeLogger as createLogger };
