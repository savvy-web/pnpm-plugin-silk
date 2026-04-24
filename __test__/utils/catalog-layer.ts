import { Layer } from "effect";
import type { SilkCatalogs } from "../../src/catalogs/types.js";
import { CatalogProvider } from "../../src/services/CatalogProvider.js";

export function makeCatalogLayer(catalogs: SilkCatalogs) {
	return Layer.succeed(CatalogProvider, catalogs);
}
