import { Layer } from "effect";
import type { SilkPeerDependencyRules } from "../../src/catalogs/types.js";
import { PeerDependencyRulesProvider } from "../../src/services/PeerDependencyRulesProvider.js";

export function makePeerDependencyRulesLayer(rules: SilkPeerDependencyRules) {
	return Layer.succeed(PeerDependencyRulesProvider, rules);
}
