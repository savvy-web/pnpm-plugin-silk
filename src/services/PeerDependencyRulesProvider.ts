import { Context, Layer } from "effect";
import { silkPeerDependencyRules } from "../catalogs/generated.js";
import type { SilkPeerDependencyRules } from "../catalogs/types.js";

export class PeerDependencyRulesProvider extends Context.Tag("PeerDependencyRulesProvider")<
	PeerDependencyRulesProvider,
	SilkPeerDependencyRules
>() {
	static Live = Layer.succeed(PeerDependencyRulesProvider, silkPeerDependencyRules);
}
