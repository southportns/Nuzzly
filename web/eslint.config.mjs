import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Allow unused vars prefixed with `_` (common pattern for unused useState setters)
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Phase 1.2.2: Enforce Write Gateway — block direct DB mutations outside allowed paths
  {
    files: ["**/*.ts", "**/*.tsx"],
    excludedFiles: [
      "**/lib/gateway/**",
      "**/lib/jobs/**",
      "**/lib/events/**",
      "**/migrations/**",
      "**/lib/supabase/admin.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='insert'][callee.object.property.name='from']",
          message: "Direct .insert() is blocked. Use writeGateway.submit() instead. See /lib/gateway/write-gateway.ts",
        },
        {
          selector: "CallExpression[callee.property.name='update'][callee.object.property.name='from']",
          message: "Direct .update() is blocked. Use writeGateway.submit() instead. See /lib/gateway/write-gateway.ts",
        },
        {
          selector: "CallExpression[callee.property.name='delete'][callee.object.property.name='from']",
          message: "Direct .delete() is blocked. Use writeGateway.submit() instead. See /lib/gateway/write-gateway.ts",
        },
        {
          selector: "CallExpression[callee.property.name='upsert'][callee.object.property.name='from']",
          message: "Direct .upsert() is blocked. Use writeGateway.submit() instead. See /lib/gateway/write-gateway.ts",
        },
        {
          selector: "CallExpression[callee.name='createAdminClient']",
          message: "createAdminClient() is restricted to /gateway/, /jobs/, /migrations/ only. Use writeGateway.submit() for mutations.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
