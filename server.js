#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const server = new Server(
  {
    name: 'finn-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_finn',
        description: 'Search for products on FINN.no marketplace',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            },
            page: {
              type: 'number',
              description: 'Page number (optional)',
              default: 1
            },
            sort: {
              type: 'string',
              description: 'Sort order: PUBLISHED_DESC (newest), PUBLISHED_ASC (oldest), PRICE_ASC (cheapest), PRICE_DESC (most expensive)',
              enum: ['PUBLISHED_DESC', 'PUBLISHED_ASC', 'PRICE_ASC', 'PRICE_DESC']
            },
            clothing_size: {
              type: 'string',
              description: 'Clothing size filter (e.g., XS, S, M, L, XL, XXL)'
            },
            price_from: {
              type: 'number',
              description: 'Minimum price'
            },
            price_to: {
              type: 'number',
              description: 'Maximum price'
            },
            condition: {
              type: 'array',
              items: {
                type: 'number',
                enum: [1, 2, 3, 4, 5]
              },
              description: 'Item condition: 1=Helt ny (uåpnet/med lapp), 2=Som ny (ikke synlig brukt), 3=Pent brukt (i god stand), 4=Brukt (noe slitasje), 5=Til deler/reparasjon'
            },
            trade_type: {
              type: 'number',
              description: 'Trade type: 1=Til salgs (for sale), 2=Gis bort (free), 3=Ønskes kjøpt (wanted)',
              enum: [1, 2, 3],
              default: 1
            },
            lat: {
              type: 'number',
              description: 'Latitude for location-based search'
            },
            lon: {
              type: 'number',
              description: 'Longitude for location-based search'
            },
            radius: {
              type: 'number',
              description: 'Search radius in meters (e.g., 30000 for 30km)',
              default: 30000
            }
          },
          required: []
        }
      },
      {
        name: 'get_finn_item',
        description: 'Get details of a specific item from FINN.no by its FINN-kode (item ID)',
        inputSchema: {
          type: 'object',
          properties: {
            finn_code: {
              type: 'string',
              description: 'The FINN-kode (numeric item ID) of the product'
            }
          },
          required: ['finn_code']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'search_finn': {
      try {
        const params = new URLSearchParams();
        
        if (args.query) {
          params.append('q', args.query);
        }
        if (args.page && args.page > 1) {
          params.append('page', args.page.toString());
        }
        if (args.sort) {
          params.append('sort', args.sort);
        }
        if (args.clothing_size) {
          params.append('clothing_size', args.clothing_size);
        }
        if (args.price_from) {
          params.append('price_from', args.price_from.toString());
        }
        if (args.price_to) {
          params.append('price_to', args.price_to.toString());
        }
        if (args.condition && Array.isArray(args.condition)) {
          args.condition.forEach(cond => {
            params.append('condition', cond.toString());
          });
        }
        if (args.trade_type) {
          params.append('trade_type', args.trade_type.toString());
        }
        if (args.lat) {
          params.append('lat', args.lat.toString());
        }
        if (args.lon) {
          params.append('lon', args.lon.toString());
        }
        if (args.radius) {
          params.append('radius', args.radius.toString());
        }

        const url = `https://www.finn.no/recommerce/forsale/search?${params.toString()}`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const results = [];
        
        $('article.sf-search-ad').each((_, element) => {
          const $el = $(element);
          const linkEl = $el.find('a.sf-search-ad-link').first();
          const href = linkEl.attr('href');
          let finnCode = null;
          
          if (href) {
            if (href.includes('/recommerce/forsale/item/')) {
              finnCode = href.split('/').pop();
            } else if (href.includes('finnkode=')) {
              finnCode = href.split('finnkode=')[1];
            }
          }
          
          const title = linkEl.text().trim();
          const price = $el.find('.flex.justify-between.font-bold span').first().text().trim() ||
                       $el.find('span').filter((_, span) => /\d+\s*kr/.test($(span).text())).first().text().trim();
          const locationAndTime = $el.find('.s-text-subtle .whitespace-nowrap');
          const location = locationAndTime.first().text().trim();
          const timeAgo = locationAndTime.last().text().trim();
          
          const sizeAndBrand = $el.find('.flex.flex-wrap.mt-4.text-xs span').map((_, span) => $(span).text().trim()).get();
          
          if (finnCode && title) {
            results.push({
              finn_code: finnCode,
              title,
              price: price || 'No price listed',
              location: location || 'No location',
              time_ago: timeAgo || '',
              size_and_brand: sizeAndBrand.length > 0 ? sizeAndBrand : [],
              url: href.startsWith('http') ? href : `https://www.finn.no${href}`
            });
          }
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                search_url: url,
                total_results: results.length,
                results: results
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching FINN.no: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
    
    case 'get_finn_item': {
      try {
        const finnCode = args.finn_code;
        const url = `https://www.finn.no/recommerce/forsale/item/${finnCode}`;
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const title = $('h1[data-testid="object-title"]').text().trim() || 
                     $('h1').first().text().trim();
        
        const price = $('.h2').filter((_, el) => /\d+\s*kr/.test($(el).text())).first().text().trim();
        
        const description = $('[data-testid="description"] .whitespace-pre-wrap').text().trim() ||
                          $('[data-testid="description"]').text().trim();
        
        const location = $('[data-testid="object-address"]').text().trim();
        
        const seller = $('img[alt*="profilbilde"]').next().text().trim() ||
                      $('div').filter((_, el) => $(el).text().includes('Selger:')).text().trim();
        
        const condition = $('span').filter((_, el) => $(el).text().includes('Tilstand')).find('b').text().trim();
        const size = $('span').filter((_, el) => $(el).text().includes('Størrelse')).find('b').text().trim();
        const color = $('span').filter((_, el) => $(el).text().includes('Farge')).find('b').text().trim();
        
        const images = [];
        $('img[data-testid^="image-"]').each((_, el) => {
          const srcset = $(el).attr('srcset');
          if (srcset) {
            const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
            const highestRes = urls[urls.length - 1];
            if (highestRes && !images.includes(highestRes)) {
              images.push(highestRes);
            }
          }
        });
        
        const keyInfo = {};
        if (condition) keyInfo.condition = condition;
        if (size) keyInfo.size = size;
        if (color) keyInfo.color = color;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                finn_code: finnCode,
                url: url,
                title,
                price,
                description,
                location,
                seller,
                key_info: keyInfo,
                images: images.slice(0, 8),
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching FINN.no item: ${error.message}`
            }
          ],
          isError: true
        };
      }
    }
    
    default:
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`
          }
        ],
        isError: true
      };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('FINN.no MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});