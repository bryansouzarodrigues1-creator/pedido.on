import type {ReaderPage} from "./menu-reader-policy.ts";

export const MENU_PDF_READER_VERSION=3;
export function retainedMenuPages(pages:ReaderPage[],files:Pick<File,"name"|"type">[]):ReaderPage[]{
 const prefixes=files.filter(file=>file.type==="application/pdf"||/\.pdf$/i.test(file.name)).map(file=>file.name.slice(0,75)+" · p. ");
 return pages.filter(page=>!prefixes.some(prefix=>page.name.startsWith(prefix)&&/^\d+$/.test(page.name.slice(prefix.length))));
}
export function hasLegacyMenuPdf(pages:ReaderPage[]):boolean{
 return pages.some(page=>/\.pdf · p\. \d+$/i.test(page.name)&&page.pdfReaderVersion!==MENU_PDF_READER_VERSION);
}
export const legacyPdfNotice="Para atualizar os nomes, preços e fotos desta leitura antiga, envie o PDF original novamente. A leitura atual fica guardada até a nova terminar.";
