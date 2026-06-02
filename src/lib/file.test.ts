import { describe, expect, it } from "vitest";
import { fileToBase64, maxImageBytes, validateImageFile } from "./file";

describe("validateImageFile", () => {
  it("rejects missing images", () => {
    expect(validateImageFile(null)).toBe("Envie uma imagem real.");
  });

  it("rejects unsupported image types", () => {
    const file = new File(["content"], "image.gif", { type: "image/gif" });

    expect(validateImageFile(file)).toBe("Use uma imagem JPG, PNG ou WebP.");
  });

  it("rejects images larger than 2MB", () => {
    const file = new File([new Uint8Array(maxImageBytes + 1)], "large.png", {
      type: "image/png",
    });

    expect(validateImageFile(file)).toBe("A imagem deve ter até 2MB.");
  });

  it("accepts valid JPG, PNG and WebP images", () => {
    const types = ["image/jpeg", "image/png", "image/webp"];

    for (const type of types) {
      const file = new File(["content"], `image.${type.split("/")[1]}`, { type });

      expect(validateImageFile(file)).toBeNull();
    }
  });
});

describe("fileToBase64", () => {
  it("converts a file to a data URL", async () => {
    const file = new File(["ChegaAí"], "chegaai.txt", { type: "text/plain" });

    await expect(fileToBase64(file)).resolves.toMatch(/^data:text\/plain;base64,/);
  });
});
