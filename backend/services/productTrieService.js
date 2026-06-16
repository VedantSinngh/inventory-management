/**
 * Trie Data Structure for Fast Product Search & Autocomplete
 * O(L) lookup time where L is length of search term
 */

class TrieNode {
  constructor() {
    this.children = new Map();
    this.isEndOfWord = false;
    this.products = []; // Products matching this prefix
  }
}

class ProductTrie {
  constructor() {
    this.root = new TrieNode();
  }

  /**
   * Insert a product with name/SKU/aliases
   */
  insert(product) {
    const searchTerms = this.extractSearchTerms(product);

    for (const term of searchTerms) {
      this.insertTerm(term, product);
    }
  }

  /**
   * Extract all searchable terms from a product
   */
  extractSearchTerms(product) {
    const terms = [];

    // Product name (and its parts)
    if (product.name) {
      terms.push(product.name.toLowerCase());
      // Add word-by-word for better matching
      product.name.toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 1) terms.push(word);
      });
    }

    // SKU
    if (product.sku) {
      terms.push(product.sku.toLowerCase());
    }

    // Category
    if (product.category) {
      terms.push(product.category.toLowerCase());
    }

    // Tags
    if (product.tags && Array.isArray(product.tags)) {
      product.tags.forEach(tag => {
        terms.push(tag.toLowerCase());
      });
    }

    // Remove duplicates
    return [...new Set(terms)];
  }

  /**
   * Insert a single term into the Trie
   */
  insertTerm(term, product) {
    let node = this.root;

    for (const char of term) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char);
      // Add product to this node (for all prefixes)
      if (!node.products.find(p => p._id === product._id)) {
        node.products.push(product);
      }
    }

    node.isEndOfWord = true;
  }

  /**
   * Search for products by prefix (autocomplete)
   * Returns up to `limit` products
   */
  search(prefix, limit = 10) {
    let node = this.root;
    const searchPrefix = prefix.toLowerCase();

    // Navigate to the prefix node
    for (const char of searchPrefix) {
      if (!node.children.has(char)) {
        return []; // No matches
      }
      node = node.children.get(char);
    }

    // Collect all products from this node and its children
    const products = [];
    const visited = new Set();
    this.collectProducts(node, products, visited, limit);

    return products;
  }

  /**
   * Recursively collect products from a node and its children
   */
  collectProducts(node, products, visited, limit) {
    if (products.length >= limit) return;

    for (const product of node.products) {
      if (!visited.has(product._id.toString())) {
        visited.add(product._id.toString());
        products.push(product);
        if (products.length >= limit) return;
      }
    }

    // DFS through children
    for (const child of node.children.values()) {
      if (products.length >= limit) return;
      this.collectProducts(child, products, visited, limit);
    }
  }

  /**
   * Fuzzy search with scoring (handles typos slightly better)
   */
  fuzzySearch(query, limit = 10) {
    const results = [];
    const visited = new Set();
    const queryLower = query.toLowerCase();

    // Breadth-first traversal of entire trie
    const queue = [(this.root, '')];

    while (queue.length > 0 && results.length < limit) {
      const [node, path] = queue.shift();

      // Check if current path matches query with low edit distance
      if (this.levenshteinDistance(path, queryLower) <= 2) {
        for (const product of node.products) {
          if (!visited.has(product._id.toString())) {
            visited.add(product._id.toString());
            results.push({
              ...product,
              matchScore: this.calculateMatchScore(product, queryLower)
            });
          }
        }
      }

      // Add children to queue
      for (const [char, child] of node.children) {
        if (results.length < limit) {
          queue.push([child, path + char]);
        }
      }
    }

    // Sort by match score (descending)
    return results
      .sort((a, b) => b.matchScore - a.matchScore)
      .map(({ matchScore, ...product }) => product)
      .slice(0, limit);
  }

  /**
   * Levenshtein distance (for fuzzy matching)
   */
  levenshteinDistance(s1, s2) {
    const matrix = Array(s2.length + 1)
      .fill(null)
      .map(() => Array(s1.length + 1).fill(0));

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
      for (let i = 1; i <= s1.length; i++) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[s2.length][s1.length];
  }

  /**
   * Calculate match quality score
   */
  calculateMatchScore(product, query) {
    let score = 0;

    // Exact SKU match
    if (product.sku && product.sku.toLowerCase() === query) {
      score += 100;
    } else if (product.sku && product.sku.toLowerCase().includes(query)) {
      score += 80;
    }

    // Name match
    if (product.name && product.name.toLowerCase() === query) {
      score += 90;
    } else if (product.name && product.name.toLowerCase().includes(query)) {
      score += 70;
    }

    // Category match
    if (product.category && product.category.toLowerCase().includes(query)) {
      score += 50;
    }

    // Tag match
    if (product.tags) {
      product.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query)) {
          score += 30;
        }
      });
    }

    return score;
  }

  /**
   * Get all products (for rebuilding or export)
   */
  getAllProducts() {
    const products = new Map();
    this.traverseAndCollect(this.root, products);
    return Array.from(products.values());
  }

  /**
   * Traverse trie and collect all unique products
   */
  traverseAndCollect(node, productMap) {
    for (const product of node.products) {
      productMap.set(product._id.toString(), product);
    }

    for (const child of node.children.values()) {
      this.traverseAndCollect(child, productMap);
    }
  }

  /**
   * Clear the entire trie
   */
  clear() {
    this.root = new TrieNode();
  }

  /**
   * Get trie statistics
   */
  getStats() {
    let nodeCount = 1;
    let productCount = 0;
    let endWordCount = 0;

    const traverse = (node) => {
      if (node.isEndOfWord) endWordCount++;
      productCount += node.products.length;

      for (const child of node.children.values()) {
        nodeCount++;
        traverse(child);
      }
    };

    traverse(this.root);

    return {
      nodeCount,
      uniqueProducts: new Set(this.getAllProducts().map(p => p._id.toString())).size,
      endWords: endWordCount,
      productReferences: productCount
    };
  }
}

export default ProductTrie;
