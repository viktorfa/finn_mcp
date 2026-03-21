This is a project for a mcp server that uses http to interact with the Norwegian secondhand marketplace Finn.no.

Make sure to search the internet to find good documentation about how to make MCPs.

MCP (Model Context Protocol) is a protocol for how AI agents can communicate with external tools, often over http.

The MCP should be able to search, filter and sort for products, as well as visit the detail page of a product in the site Finn.no.

An example URL for a search is: `https://www.finn.no/recommerce/forsale/search?clothing_size=M&page=2&q=skjorter&sort=PUBLISHED_DESC`

Notice that `recommerce` is the path to the marketplace of all sorts of items known as "Torget". `forsale` means items for sale. There are many other URL search params that can be used as well.

An example of a detail page URL is: `https://www.finn.no/recommerce/forsale/item/343932826`.
Note that all items on Finn.no have a numeric uid known as "FINN-kode".
