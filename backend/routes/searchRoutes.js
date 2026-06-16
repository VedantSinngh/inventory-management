import express from 'express';
import { protect } from '../middleware/auth.js';
import ProductTrie from '../services/productTrieService.js';
import Product from '../models/Product.js';
import logger from '../services/logger.js';

const router = express.Router();

// Global trie instance (in production, use Redis cache)
let productTrie = new ProductTrie();
let trieBuildTime = null;

/**
 * Initialize/rebuild the product trie
 */
async function rebuildTrie() {
  try {
    const products = await Product.find({ deletedAt: null }).lean();
    productTrie.clear();

    for (const product of products) {
      productTrie.insert(product);
    }

    trieBuildTime = new Date();
    logger.info('Product Trie rebuilt', {
      productCount: products.length,
      stats: productTrie.getStats()
    });
  } catch (error) {
    logger.error('Trie rebuild error', { error: error.message });
  }
}

/**
 * Build trie on first request
 */
async function ensureTrieBuilt() {
  if (!trieBuildTime || (Date.now() - trieBuildTime.getTime() > 3600000)) {
    // Rebuild every hour
    await rebuildTrie();
  }
}

/**
 * GET /api/search/products
 * Fast prefix-based product search using Trie
 */
router.get('/products', protect, async (req, res) => {
  try {
    const { q, limit = 10, exact = false } = req.query;

    if (!q || q.length < 1) {
      return res.status(400).json({
        message: 'Search query required (minimum 1 character)',
        status: 400
      });
    }

    // Ensure trie is built
    await ensureTrieBuilt();

    let results;

    if (exact) {
      // Exact prefix match
      results = productTrie.search(q, parseInt(limit));
    } else {
      // Fuzzy match for typo tolerance
      results = productTrie.fuzzySearch(q, parseInt(limit));
    }

    logger.info('Product search executed', {
      query: q,
      resultCount: results.length,
      userId: req.user.id
    });

    res.json({
      data: results.map(p => ({
        _id: p._id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        stock: p.stock,
        price: p.price,
        lowStockThreshold: p.lowStockThreshold,
        warehouse: p.warehouse
      })),
      pagination: {
        total: results.length,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Product search error', { error: error.message });
    res.status(500).json({
      message: 'Error searching products',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/search/autocomplete
 * Autocomplete suggestions while typing
 */
router.get('/autocomplete', protect, async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        data: [],
        pagination: null
      });
    }

    await ensureTrieBuilt();
    const results = productTrie.search(q, parseInt(limit));

    res.json({
      data: results.map(p => ({
        id: p._id,
        text: `${p.sku} - ${p.name}`,
        sku: p.sku,
        name: p.name,
        stock: p.stock
      })),
      pagination: null
    });
  } catch (error) {
    logger.error('Autocomplete error', { error: error.message });
    res.status(500).json({
      message: 'Error generating autocomplete',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/search/rebuild-index
 * Manually rebuild the search index (admin only)
 */
router.post('/rebuild-index', protect, async (req, res) => {
  try {
    // Check admin role
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        message: 'Unauthorized - admin only',
        status: 403
      });
    }

    await rebuildTrie();
    const stats = productTrie.getStats();

    logger.info('Search index rebuilt by admin', {
      userId: req.user.id,
      stats
    });

    res.json({
      message: 'Search index rebuilt successfully',
      data: {
        buildTime: trieBuildTime,
        stats
      }
    });
  } catch (error) {
    logger.error('Index rebuild error', { error: error.message });
    res.status(500).json({
      message: 'Error rebuilding search index',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/search/stats
 * Get trie statistics
 */
router.get('/stats', protect, async (req, res) => {
  try {
    await ensureTrieBuilt();
    const stats = productTrie.getStats();

    res.json({
      data: {
        ...stats,
        lastBuilt: trieBuildTime
      },
      pagination: null
    });
  } catch (error) {
    logger.error('Stats fetch error', { error: error.message });
    res.status(500).json({
      message: 'Error fetching search stats',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/search/product-added
 * Webhook: called when product is added
 */
router.post('/product-added', protect, async (req, res) => {
  try {
    const { productId } = req.body;

    const product = await Product.findById(productId).lean();
    if (!product) {
      return res.status(404).json({
        message: 'Product not found',
        status: 404
      });
    }

    await ensureTrieBuilt();
    productTrie.insert(product);

    logger.info('Product added to search index', { productId });

    res.json({
      message: 'Product added to search index'
    });
  } catch (error) {
    logger.error('Product add hook error', { error: error.message });
    res.status(500).json({
      message: 'Error adding product to index',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/search/product-updated
 * Webhook: called when product is updated
 */
router.post('/product-updated', protect, async (req, res) => {
  try {
    // For updates, just rebuild the entire index (or keep incremental update)
    // For now, trigger a rebuild
    await rebuildTrie();

    logger.info('Search index updated');

    res.json({
      message: 'Search index updated'
    });
  } catch (error) {
    logger.error('Product update hook error', { error: error.message });
    res.status(500).json({
      message: 'Error updating search index',
      error: error.message,
      status: 500
    });
  }
});

export default router;
