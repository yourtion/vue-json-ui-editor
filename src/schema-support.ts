/** Describes rendering support only. Always validate data with a JSON Schema validator. */
export interface SchemaIssue {
  /** JSON Pointer into the schema, with # denoting its root. */
  path: string;
  keyword: string;
  message: string;
}

export interface SchemaSupport {
  supported: boolean;
  issues: SchemaIssue[];
}

const annotations = new Set([
  "$schema",
  "$id",
  "$comment",
  "title",
  "description",
  "default",
  "examples",
  "readOnly",
  "writeOnly",
  "deprecated",
]);
const rendered = new Set([
  "type",
  "properties",
  "required",
  "items",
  "enum",
  "additionalProperties",
  "minimum",
  "maximum",
  "minLength",
  "maxLength",
  "pattern",
  "format",
  "minItems",
  "maxItems",
]);
// These constraints need external validation even when their fields can be rendered.
const validationOnly = new Set([
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "uniqueItems",
  "minProperties",
  "maxProperties",
]);
const extensions = new Set(["attrs", "component", "disabled", "visible", "name", "checked"]);
const scalarTypes = new Set(["string", "number", "integer", "boolean"]);
const escapePointer = (value: string) => value.replace(/~/g, "~0").replace(/\//g, "~1");

/**
 * Conservative support check for MCP inputSchema / Agent function.parameters.
 * Unknown or ambiguous constructs select a JSON editor instead of being silently
 * flattened into incorrect controls. This is NOT a schema or data validator.
 */
export function inspectSchema(schema: unknown): SchemaSupport {
  const issues: SchemaIssue[] = [];
  const ancestors = new WeakSet<object>();
  const report = (path: string, keyword: string, message: string) => {
    issues.push({ path, keyword, message });
  };
  const visit = (value: unknown, path: string, root = false): void => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      report(path, "schema", "Only object-form schemas can be rendered.");
      return;
    }
    if (ancestors.has(value)) {
      report(path, "schema", "Cyclic schemas cannot be rendered.");
      return;
    }
    ancestors.add(value);
    const node = value as Record<string, unknown>;
    const type = node.type;
    if (root && type !== "object") {
      report(`${path}/type`, "type", "The form root must be an object.");
    } else if (typeof type !== "string" || !["object", "array", ...scalarTypes].includes(type)) {
      report(
        `${path}/type`,
        "type",
        "Use an explicit supported type; unions and null require JSON editing.",
      );
    }
    for (const keyword of Object.keys(node)) {
      if (
        !annotations.has(keyword) &&
        !rendered.has(keyword) &&
        !validationOnly.has(keyword) &&
        !extensions.has(keyword)
      ) {
        report(`${path}/${escapePointer(keyword)}`, keyword, `Unsupported keyword: ${keyword}.`);
      }
    }
    if (node.required !== undefined && !Array.isArray(node.required)) {
      report(
        `${path}/required`,
        "required",
        "Boolean required is a legacy UI extension, not JSON Schema.",
      );
    }
    if (
      node.enum !== undefined &&
      (!scalarTypes.has(String(type)) ||
        !Array.isArray(node.enum) ||
        node.enum.some(
          (item) => item === null || !["string", "number", "boolean"].includes(typeof item),
        ))
    ) {
      report(
        `${path}/enum`,
        "enum",
        "Only scalar enums are rendered; object/array/null choices require JSON editing.",
      );
    }
    if (type === "object") {
      if (node.additionalProperties !== undefined && node.additionalProperties !== false) {
        report(
          `${path}/additionalProperties`,
          "additionalProperties",
          "Dynamic object keys require JSON editing.",
        );
      }
      const properties = node.properties;
      if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
        report(`${path}/properties`, "properties", "Object forms need an explicit properties map.");
      } else {
        for (const [key, child] of Object.entries(properties)) {
          const childPath = `${path}/properties/${escapePointer(key)}`;
          if (
            !key ||
            Number.isInteger(Number(key)) ||
            key.includes(".") ||
            key.startsWith("$") ||
            ["__proto__", "prototype", "constructor"].includes(key)
          ) {
            report(
              childPath,
              "properties",
              "This property name cannot be represented by the editor's field paths.",
            );
          } else {
            visit(child, childPath);
          }
        }
      }
    }
    if (type === "array") {
      if (
        !node.items ||
        typeof node.items !== "object" ||
        Array.isArray(node.items) ||
        (node.items as Record<string, unknown>).type !== "object"
      ) {
        report(`${path}/items`, "items", "Only homogeneous arrays of objects have a row editor.");
      } else {
        visit(node.items, `${path}/items`);
      }
    }
    ancestors.delete(value);
  };
  visit(schema, "#", true);
  return { supported: issues.length === 0, issues };
}
