# # cooccurrence.py

from collections import defaultdict
from itertools import combinations


def build_cooccurrence(jobs_skills):
    pair_count = defaultdict(int)
    skill_freq = defaultdict(int)

    for skills in jobs_skills:
        unique_skills = set(skills)
        for s in unique_skills:
            skill_freq[s] += 1
        for pair in combinations(sorted(unique_skills), 2):
            pair_count[pair] += 1

    return pair_count, skill_freq


def get_relations(pair_count, skill_freq, threshold):
    relations = []
    for (s1, s2), count in pair_count.items():
        if count >= threshold and len(s1) < 40 and len(s2) < 40:
            relations.append((s1, s2, count))
    return relations