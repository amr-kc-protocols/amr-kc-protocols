# Fonts

## KCFormSans

`KCFormSans-Bold.ttf` is used by the Caregiver Signature Form PDF generator in
`index.html`. The printed form is set in Calibri, so the PDF needs Calibri's
metrics to line up with the original — jsPDF only ships Helvetica/Times/Courier,
which are wider. Bold is the only weight here because every line of that form is
bold, and jsPDF embeds each font it is handed whether the page uses it or not.

These files are Latin-subsets of **Carlito** (Łukasz Dziedzic), which is
metrically compatible with Calibri: identical advance widths, ascender (1950),
descender (550), and units-per-em (2048), so text occupies exactly the same
space as it does in Word.

Carlito is licensed under the SIL Open Font License 1.1 (see `OFL.txt`) with
the Reserved Font Name "Carlito". A subset is a Modified Version, and the OFL
forbids Modified Versions from using a Reserved Font Name, so these files are
renamed to `KCFormSans`. Glyph outlines and metrics are unchanged.

### Regenerating

Upstream: https://github.com/google/fonts/tree/main/ofl/carlito

```sh
pip install fonttools
curl -O https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Regular.ttf
curl -O https://raw.githubusercontent.com/google/fonts/main/ofl/carlito/Carlito-Bold.ttf

# Subset to Latin-1 + the punctuation the form can produce, then rename the
# family to KCFormSans (name IDs 0,1,2,3,4,6,13,14,16,17).
python3 -m fontTools.subset Carlito-Bold.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+20AC,U+2122" \
  --layout-features= --no-hinting --desubroutinize \
  --drop-tables+=GDEF,GSUB,GPOS,DSIG,LTSH,hdmx,VDMX,kern \
  --output-file=KCFormSans-Bold.ttf
```

Keep the subset small: it is fetched by the PWA and base64-encoded into the
jsPDF virtual file system at PDF-generation time.
