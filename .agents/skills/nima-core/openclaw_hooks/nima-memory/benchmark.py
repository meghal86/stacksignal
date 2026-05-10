#!/usr/bin/env python3
"""
NIMA Scalability Benchmark
===========================

Performance comparison: O(N) brute force vs O(log N) FAISS index.

Tests:
  1. Search latency at different dataset sizes (1K, 10K, 50K, 100K)
  2. Cache hit rate simulation
  3. Rate limiter throughput
  4. Incremental index update speed

Run: python3 benchmark.py [test_name]

Author: NIMA Backend Architect
Date: 2026-02-16
"""

import os
import sys
import time
import json
import struct
import sqlite3
import random
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Tuple
import numpy as np

# Paths
NIMA_DIR = Path.home() / ".nima" / "memory"
GRAPH_DB = NIMA_DIR / "graph.sqlite"

EMBEDDING_DIM = 512


def generate_random_embeddings(n: int, dim: int = EMBEDDING_DIM) -> np.ndarray:
    """Generate random unit vectors (simulating real embeddings)."""
    vecs = np.random.randn(n, dim).astype(np.float32)
    norms = np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-8
    return vecs / norms


def cosine_similarity_brute_force(query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """O(N) cosine similarity."""
    query_norm = query / (np.linalg.norm(query) + 1e-8)
    norms = np.linalg.norm(matrix, axis=1, keepdims=True) + 1e-8
    normalized = matrix / norms
    return np.dot(normalized, query_norm)


def benchmark_brute_force(sizes: List[int] = [1000, 10000, 50000, 100000],
                          num_queries: int = 10) -> Dict:
    """Benchmark O(N) brute force search at different scales."""
    results = {}
    
    print("\n📊 BRUTE FORCE (O(N)) BENCHMARK")
    print("=" * 50)
    
    for n in sizes:
        print(f"\nDataset size: {n:,} vectors")
        
        # Generate random embeddings
        matrix = generate_random_embeddings(n)
        query = generate_random_embeddings(1)[0]
        
        # Warm up
        _ = cosine_similarity_brute_force(query, matrix)
        
        # Benchmark
        latencies = []
        for _ in range(num_queries):
            query = generate_random_embeddings(1)[0]
            start = time.perf_counter()
            similarities = cosine_similarity_brute_force(query, matrix)
            top_k = np.argsort(similarities)[-10:][::-1]
            latencies.append((time.perf_counter() - start) * 1000)  # ms
        
        avg_ms = np.mean(latencies)
        p99_ms = np.percentile(latencies, 99)
        
        results[n] = {
            'avg_ms': round(avg_ms, 2),
            'p99_ms': round(p99_ms, 2),
            'qps': round(1000 / avg_ms, 1)
        }
        
        print(f"  Avg: {avg_ms:.2f}ms | P99: {p99_ms:.2f}ms | QPS: {1000/avg_ms:.1f}")
    
    return results


def benchmark_faiss(sizes: List[int] = [1000, 10000, 50000, 100000],
                    num_queries: int = 100) -> Dict:
    """Benchmark FAISS index at different scales."""
    try:
        import faiss
    except ImportError:
        print("❌ FAISS not installed. Run: pip install faiss-cpu")
        return {}
    
    results = {}
    
    print("\n📊 FAISS (O(log N)) BENCHMARK")
    print("=" * 50)
    
    for n in sizes:
        print(f"\nDataset size: {n:,} vectors")
        
        # Generate random embeddings
        matrix = generate_random_embeddings(n)
        
        # Build index
        start = time.perf_counter()
        if n < 5000:
            # Flat index for small datasets
            index = faiss.IndexFlatIP(EMBEDDING_DIM)
        else:
            # IVF for larger datasets
            nlist = min(100, int(np.sqrt(n)))
            quantizer = faiss.IndexFlatL2(EMBEDDING_DIM)
            index = faiss.IndexIVFFlat(quantizer, EMBEDDING_DIM, nlist, faiss.METRIC_INNER_PRODUCT)
            index.train(matrix)
            index.nprobe = 10
        
        index.add(matrix)
        build_time = (time.perf_counter() - start) * 1000
        print(f"  Build time: {build_time:.1f}ms")
        
        # Benchmark queries
        latencies = []
        for _ in range(num_queries):
            query = generate_random_embeddings(1)
            start = time.perf_counter()
            scores, indices = index.search(query, 10)
            latencies.append((time.perf_counter() - start) * 1000)
        
        avg_ms = np.mean(latencies)
        p99_ms = np.percentile(latencies, 99)
        
        results[n] = {
            'build_ms': round(build_time, 2),
            'avg_ms': round(avg_ms, 4),
            'p99_ms': round(p99_ms, 4),
            'qps': round(1000 / avg_ms, 1)
        }
        
        print(f"  Avg: {avg_ms:.4f}ms | P99: {p99_ms:.4f}ms | QPS: {1000/avg_ms:.0f}")
    
    return results


def benchmark_cache():
    """Benchmark embedding cache performance."""
    try:
        from voyage_cache import VoyageCachedClient, DiskCache
    except ImportError:
        print("❌ voyage_cache not available")
        return {}
    
    print("\n📊 CACHE PERFORMANCE BENCHMARK")
    print("=" * 50)
    
    results = {}
    
    # Test disk cache
    print("\nDisk cache (SQLite):")
    cache = DiskCache("/tmp/nima_cache_benchmark.db")
    
    test_queries = [f"test query {i}" for i in range(1000)]
    test_embeddings = [generate_random_embeddings(1)[0] for _ in range(1000)]
    
    # Write benchmark
    start = time.perf_counter()
    for q, e in zip(test_queries, test_embeddings):
        cache.set(q, e)
    write_time = (time.perf_counter() - start) * 1000
    print(f"  Write 1000 entries: {write_time:.1f}ms ({write_time/1000:.3f}ms each)")
    
    # Read benchmark (all hits)
    start = time.perf_counter()
    for q in test_queries:
        _ = cache.get(q)
    read_time = (time.perf_counter() - start) * 1000
    print(f"  Read 1000 entries: {read_time:.1f}ms ({read_time/1000:.3f}ms each)")
    
    results['disk_cache'] = {
        'write_ms_each': round(write_time / 1000, 3),
        'read_ms_each': round(read_time / 1000, 3)
    }
    
    # Test LRU cache
    print("\nLRU cache (in-memory):")
    client = VoyageCachedClient(rate_limit=1000, lru_size=1000)
    
    # Simulate populating LRU cache
    for q, e in zip(test_queries[:500], test_embeddings[:500]):
        client._lru_set(q[:32], e)  # Use hash
    
    # LRU hit benchmark
    start = time.perf_counter()
    hits = 0
    for q in test_queries[:500]:
        if client._lru_get(q[:32]) is not None:
            hits += 1
    lru_time = (time.perf_counter() - start) * 1000
    print(f"  500 LRU lookups: {lru_time:.2f}ms ({lru_time/500*1000:.1f}μs each)")
    print(f"  Hit rate: {hits/500*100:.1f}%")
    
    results['lru_cache'] = {
        'lookup_us_each': round(lru_time / 500 * 1000, 1)
    }
    
    # Cleanup
    import os
    os.remove("/tmp/nima_cache_benchmark.db")
    
    return results


def benchmark_rate_limiter():
    """Benchmark rate limiter throughput."""
    try:
        from voyage_cache import RateLimiter
    except ImportError:
        print("❌ voyage_cache not available")
        return {}
    
    print("\n📊 RATE LIMITER BENCHMARK")
    print("=" * 50)
    
    results = {}
    
    for rate in [10, 50, 100]:
        limiter = RateLimiter(rate_limit=rate)
        
        # Measure actual throughput
        start = time.perf_counter()
        count = 0
        deadline = start + 1.0  # 1 second
        
        while time.perf_counter() < deadline:
            if limiter.acquire(timeout=0.01):
                count += 1
        
        elapsed = time.perf_counter() - start
        actual_rate = count / elapsed
        
        print(f"  Rate limit {rate}/sec: Achieved {actual_rate:.1f}/sec")
        results[rate] = round(actual_rate, 1)
    
    return results


def benchmark_incremental_update():
    """Benchmark incremental FAISS index updates."""
    try:
        import faiss
    except ImportError:
        print("❌ FAISS not installed")
        return {}
    
    print("\n📊 INCREMENTAL INDEX UPDATE BENCHMARK")
    print("=" * 50)
    
    # Start with base index
    n_base = 10000
    n_add = 100
    
    matrix = generate_random_embeddings(n_base)
    
    # Build base index
    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(matrix)
    print(f"  Base index: {n_base:,} vectors")
    
    # Benchmark incremental adds
    latencies = []
    for _ in range(10):
        new_vecs = generate_random_embeddings(n_add)
        start = time.perf_counter()
        index.add(new_vecs)
        latencies.append((time.perf_counter() - start) * 1000)
    
    avg_ms = np.mean(latencies)
    print(f"  Add {n_add} vectors: {avg_ms:.2f}ms avg")
    print(f"  Add 1 vector: {avg_ms/n_add:.3f}ms")
    
    return {
        'add_100_ms': round(avg_ms, 2),
        'add_1_ms': round(avg_ms / n_add, 3)
    }


def compare_speedup(brute_results: Dict, faiss_results: Dict):
    """Calculate and display speedup factors."""
    print("\n📊 SPEEDUP COMPARISON (FAISS vs Brute Force)")
    print("=" * 50)
    
    for n in brute_results.keys():
        if n in faiss_results:
            brute_ms = brute_results[n]['avg_ms']
            faiss_ms = faiss_results[n]['avg_ms']
            speedup = brute_ms / faiss_ms
            print(f"  {n:>7,} vectors: {speedup:,.0f}x faster ({brute_ms:.1f}ms → {faiss_ms:.4f}ms)")


def run_all_benchmarks():
    """Run all benchmarks."""
    print("\n" + "=" * 60)
    print("NIMA SCALABILITY BENCHMARK SUITE")
    print("=" * 60)
    print(f"Date: {datetime.now().isoformat()}")
    print(f"Platform: {sys.platform}")
    
    # Check dependencies
    try:
        import faiss
        print("FAISS: ✅ Installed")
    except ImportError:
        print("FAISS: ❌ Not installed (run: pip install faiss-cpu)")
    
    sizes = [1000, 10000, 50000, 100000]
    
    results = {
        'timestamp': datetime.now().isoformat(),
        'tests': {}
    }
    
    # Run benchmarks
    brute_results = benchmark_brute_force(sizes, num_queries=10)
    results['tests']['brute_force'] = brute_results
    
    faiss_results = benchmark_faiss(sizes, num_queries=100)
    results['tests']['faiss'] = faiss_results
    
    if brute_results and faiss_results:
        compare_speedup(brute_results, faiss_results)
    
    cache_results = benchmark_cache()
    results['tests']['cache'] = cache_results
    
    rate_results = benchmark_rate_limiter()
    results['tests']['rate_limiter'] = rate_results
    
    incremental_results = benchmark_incremental_update()
    results['tests']['incremental_update'] = incremental_results
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    if faiss_results and 100000 in faiss_results:
        print(f"✅ FAISS @ 100K vectors: {faiss_results[100000]['avg_ms']:.2f}ms ({faiss_results[100000]['qps']:.0f} QPS)")
    
    if brute_results and 100000 in brute_results:
        print(f"❌ Brute Force @ 100K: {brute_results[100000]['avg_ms']:.0f}ms ({brute_results[100000]['qps']:.1f} QPS)")
    
    if brute_results and faiss_results and 100000 in brute_results and 100000 in faiss_results:
        speedup = brute_results[100000]['avg_ms'] / faiss_results[100000]['avg_ms']
        print(f"📈 Speedup: {speedup:,.0f}x")
    
    # Save results
    output_path = NIMA_DIR / "benchmark_results.json"
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n💾 Results saved to: {output_path}")
    
    return results


if __name__ == "__main__":
    if len(sys.argv) > 1:
        test = sys.argv[1]
        if test == 'brute':
            benchmark_brute_force()
        elif test == 'faiss':
            benchmark_faiss()
        elif test == 'cache':
            benchmark_cache()
        elif test == 'rate':
            benchmark_rate_limiter()
        elif test == 'incremental':
            benchmark_incremental_update()
        else:
            print(f"Unknown test: {test}")
            print("Available: brute, faiss, cache, rate, incremental")
    else:
        run_all_benchmarks()
