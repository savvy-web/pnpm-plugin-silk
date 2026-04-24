import { Context, Layer } from "effect";
import { silkCatalogs } from "../catalogs/generated.js";
import type { SilkCatalogs } from "../catalogs/types.js";

export class CatalogProvider extends Context.Tag("CatalogProvider")<CatalogProvider, SilkCatalogs>() {
	static Live = Layer.succeed(CatalogProvider, silkCatalogs);
}
