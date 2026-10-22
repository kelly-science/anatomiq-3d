SELF-HOSTING ÉCORCHÉ (GLB, ~13.7 MB)
==================================
Run `bash tools/download-self-hosted-assets.sh` from the app folder on an Internet-connected Mac.
The script downloads `models/ecorche.glb` and the corresponding attribution documents, and pins a checksum.
Then upload the `models/` folder to your GitHub Pages repository.

Without this file the app retains its earlier external-model fallback to avoid disrupting older deployments.
With this file present, the app loads the local copy first and does not contact a model CDN.

Attribution: Écorché (https://github.com/Charleeh/ecorche), CC BY-SA 4.0.
Based on BodyParts3D (DBCLS), CC BY 4.0; Z-Anatomy (Gauthier Kervyn), CC BY-SA 4.0.
Retain original credits and license notices on redistribution.
