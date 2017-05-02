import { expect } from "chai";
import { stub } from "sinon";

import Manifest, { Link } from "../src/Manifest";
import MemoryStore from "../src/MemoryStore";

describe("Manifest", () => {
    let manifest: Manifest;
    let emptyManifest: Manifest;

    beforeEach(() => {
        manifest = new Manifest({
            metadata: {
                title: "Alice's Adventures in Wonderland"
            },
            links: [
                { href: "a-link.html" }
            ],
            spine: [
                { href: "spine-item-1.html" },
                { href: "spine-item-2.html" },
                { href: "spine-item-3.html" }
            ],
            resources: [
                { href: "contents.html", rel: ["contents"] },
                { href: "cover.jpg" }
            ],
            toc: [
                { href: "spine-item-1.html", title: "Chapter 1" },
                { href: "spine-item-2.html", title: "Chapter 2" }
            ],
        }, new URL("http://example.com/manifest.json"));

        emptyManifest = new Manifest({}, new URL("http://example.com/manifest.json"));
    });

    describe("#getManifest", () => {
        const manifestJSON = {
            metadata: {
                title: "Alice's Adventures in Wonderland"
            }
        };
        const manifest = new Manifest(manifestJSON, new URL("https://example.com/manifest.json"));
        let store: MemoryStore;

        const mockFetchAPI = (response: Promise<Response>) => {
            window.fetch = stub().returns(response);
        };

        beforeEach(() => {
            store = new MemoryStore();
        });

        describe("if fetching the manifest fails", () => {
            const fetchFailure = new Promise((_, reject) => reject());

            beforeEach(() => {
                mockFetchAPI(fetchFailure);
            })

            it("should return cached manifest from local store", async () => {
                const key = "manifest";
                await store.set(key, JSON.stringify(manifestJSON));

                const response: Manifest = await Manifest.getManifest(new URL("https://example.com/manifest.json"), store);
                expect(response).to.deep.equal(manifest);
            });

            it("should reject promise if there's nothing in the store", async () => {
                let rejected = false;
                try {
                    await Manifest.getManifest(new URL("https://example.com/manifest.json"), store);
                } catch (err) {
                    rejected = true;
                }
                expect(rejected).to.be.true;
            });
        });

        it("should return the response from fetch, and save it to local store", async () => {
            const fetchResponse = ({
                json: () => {
                    return new Promise(resolve => resolve(manifestJSON));
                }
            } as any);
            const fetchSuccess = new Promise(resolve => resolve(fetchResponse));

            mockFetchAPI(fetchSuccess);

            const response: Manifest = await Manifest.getManifest(new URL("https://example.com/manifest.json"), store);
            expect(response).to.deep.equal(manifest);

            const key = "manifest";
            const storedValue = await store.get(key);
            expect(storedValue).to.equal(JSON.stringify(manifestJSON));
        });
    });

    describe("#constructor", () => {
        it("should handle empty input", () => {
            expect(emptyManifest.metadata).to.deep.equal({});
            expect(emptyManifest.links).to.deep.equal([]);
            expect(emptyManifest.spine).to.deep.equal([]);
            expect(emptyManifest.resources).to.deep.equal([]);
        });

        it("should store metadata", () => {
            expect(manifest.metadata.title).to.equal("Alice's Adventures in Wonderland");
        });

        it("should store links", () => {
            expect(manifest.links.length).to.equal(1);
            expect(manifest.links[0].href).to.equal("a-link.html");
        });

        it("should store spine", () => {
            expect(manifest.spine.length).to.equal(3);
            expect(manifest.spine[0].href).to.equal("spine-item-1.html");
        });

        it("should store resources", () => {
            expect(manifest.resources.length).to.equal(2);
            expect(manifest.resources[0].href).to.equal("contents.html");
        });

        it("should store toc", () => {
            expect(manifest.toc.length).to.equal(2);
            expect(manifest.toc[0].title).to.equal("Chapter 1");
        });
    });

    describe("#getStartLink", () => {
        it("should return the first spine item", () =>  {
            const start = manifest.getStartLink() as Link;
            expect(start).not.to.be.null;
            expect(start.href).to.equal("spine-item-1.html");
        });

        it("should return null if spine is empty", () => {
            const start = emptyManifest.getStartLink();
            expect(start).to.be.null;
        });
    });

    describe("#getPreviousSpineItem", () => {
        it("should return previous spine item", () => {
            let previous = manifest.getPreviousSpineItem("http://example.com/spine-item-2.html") as Link;
            expect(previous).not.to.be.null;
            expect(previous.href).to.equal("spine-item-1.html");            

            previous = manifest.getPreviousSpineItem("http://example.com/spine-item-3.html") as Link;
            expect(previous).not.to.be.null;
            expect(previous.href).to.equal("spine-item-2.html");
        });

        it("should return null for first spine item", () => {
            const previous = manifest.getPreviousSpineItem("http://example.com/spine-item-1.html");
            expect(previous).to.be.null;
        });

        it("should return null for item not in the spine", () => {
            const previous = manifest.getPreviousSpineItem("http://example.com/toc.html");
            expect(previous).to.be.null;
        });
    });

    describe("#getNextSpineItem", () => {
        it("should return next spine item", () => {
            let next = manifest.getNextSpineItem("http://example.com/spine-item-1.html") as Link;
            expect(next).not.to.be.null;
            expect(next.href).to.equal("spine-item-2.html");

            next = manifest.getNextSpineItem("http://example.com/spine-item-2.html") as Link;
            expect(next).not.to.be.null;
            expect(next.href).to.equal("spine-item-3.html");
        });

        it("should return null for last spine item", () => {
            const next = manifest.getNextSpineItem("http://example.com/spine-item-3.html");
            expect(next).to.be.null;
        });

        it("should return null for item not in the spine", () => {
            const next = manifest.getNextSpineItem("http://example.com/toc.html");
            expect(next).to.be.null;
        });
    });

    describe("#getSpineItem", () => {
        it("should return correct spine item", () => {
            let item = manifest.getSpineItem("http://example.com/spine-item-1.html") as Link;
            expect(item).not.to.be.null;
            expect(item.href).to.equal("spine-item-1.html");

            item = manifest.getSpineItem("http://example.com/spine-item-2.html") as Link;
            expect(item).not.to.be.null;
            expect(item.href).to.equal("spine-item-2.html");
        });

        it("should return null for item not in the spine", () => {
            const item = manifest.getSpineItem("http://example.com/toc.html");
            expect(item).to.be.null;
        });
    });
});

