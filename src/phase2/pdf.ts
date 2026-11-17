/** Render through Canvas so Malayalam shaping is preserved in exported PDFs. */
export async function downloadPdf(
  title: string,
  lines: string[],
  filename: string,
) {
  const { jsPDF } = await import("jspdf");
  const font = new FontFace(
    "NilaExport",
    "url(/fonts/NotoSansMalayalam-Regular.ttf)",
  );
  await font.load();
  document.fonts.add(font);
  const pdf = new jsPDF();
  let canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1697;
  let ctx = canvas.getContext("2d")!;
  let y = 100;
  let page = 0;
  const begin = () => {
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 1200, 1697);
    ctx.fillStyle = "#252137";
    ctx.font = "32px NilaExport, sans-serif";
    ctx.fillText(title, 70, 70);
    ctx.font = "22px NilaExport, sans-serif";
    y = 125;
  };
  const flush = () => {
    if (page++) pdf.addPage();
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, 210, 297);
  };
  begin();
  for (const line of lines) {
    const words = line.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? current + " " + word : word;
      if (ctx.measureText(candidate).width > 1060 && current) {
        if (y > 1600) {
          flush();
          begin();
        }
        ctx.fillText(current, 70, y);
        y += 42;
        current = word;
      } else current = candidate;
    }
    if (y > 1600) {
      flush();
      begin();
    }
    ctx.fillText(current, 70, y);
    y += 42;
  }
  flush();
  pdf.save(filename);
}
