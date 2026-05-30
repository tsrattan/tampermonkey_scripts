git remote -v
git remote set-url origin git@github.com:tsrattan/tampermonkey_scripts.git
git remote -v

ssh -T git@github.com
git push -u origin main
