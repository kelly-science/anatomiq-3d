"""Conservative source-name classification for Z-Anatomy lymphatic meshes.

No assumptions about the count of nodes or atlas revision; all exported nodes
are listed in an audit for manual verification.
"""
import hashlib
import re

NODE = re.compile(r"\b(?:lymph(?:atic)?\s+(?:node|gland)s?|lymphonod(?:us|i)|nod(?:us|i)\s+lymphatic(?:us|i)|nodi\s+(?:cervicales|axillares|inguinales)|retropharyngeal\s+nodes?|axillary\s+nodes?|inguinal\s+nodes?)\b", re.I)
VESSEL = re.compile(r"\b(?:lymphatic\s+(?:vessel|duct|trunk|collector)s?|thoracic\s+duct|right\s+lymphatic\s+duct|ductus\s+thoracicus|cisterna\s+chyli|chylous\s+cistern|truncus\s+(?:jugularis|subclavius|bronchomediastinalis|intestinalis|lumbalis))\b", re.I)
IMMUNE = re.compile(r"\b(?:tonsil|tonsilla|peyer.?s\s+patch(?:es)?|appendix\s+vermiformis)\b", re.I)
LYMPH_CONTEXT = re.compile(r"\b(?:lymphatic|lymphoid|lymphatics|lymph\s+nodes?)\b", re.I)
ANCHOR_SPLEEN = re.compile(r"\b(?:spleen|splen)\b", re.I)
ANCHOR_THYMUS = re.compile(r"\bthymus\b|\bthymic\b", re.I)


def classify(name, ancestors=()):
    if re.search(r'\btonsil\s+of\s+cerebellum\b', name, re.I):
        return None
    s = " ".join([name, *ancestors])
    if NODE.search(s): return 'node'
    if VESSEL.search(s): return 'vessel'
    if IMMUNE.search(s): return 'immune'
    # Nodes such as 'Deep cervical' live under a 'Lymphatic system' collection.
    if any(LYMPH_CONTEXT.search(x) for x in ancestors) and not (ANCHOR_SPLEEN.search(name) or ANCHOR_THYMUS.search(name)):
        return 'unclassified_lymphatic'
    return None


def anchor(name, ancestors=()):
    s=' '.join([name,*ancestors]).lower()
    if ANCHOR_SPLEEN.search(s) and (ANCHOR_SPLEEN.search(name) or 'spleen' in s):return 'spleen'
    if ANCHOR_THYMUS.search(s):
        if re.search(r'\bleft\b|\.l\b|_l\b',s):return 'thymus_left'
        if re.search(r'\bright\b|\.r\b|_r\b',s):return 'thymus_right'
    return None


def stable_id(name, hierarchy):
    return 'ZA' + hashlib.sha256((hierarchy+'|'+name).encode('utf-8')).hexdigest()[:16].upper()
