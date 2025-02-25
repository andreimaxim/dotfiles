# Emacs Configuration

This is a minimal Emacs configuration that sets up a simple UI and some packages
that allow working with Ruby on Rails applications a bit easier.


## Compiling Emacs

The instructions are targeting Ubuntu 22.04 and involve building Emacs from source code,
as it's simple enough and allows enabling a very specific set of features.


### Initial setup

The following system packages are required to build Emacs:

```shell
sudo apt install build-essential libgtk-3-dev libgnutls28-dev libtiff5-dev libgif-dev \
    libjpeg-dev libpng-dev libxpm-dev libncurses-dev texinfo autoconf libjansson4 \
    libjansson-dev libxml2-dev librsvg2-dev libgccjit0 libgccjit-10-dev gcc-10 g++-10
```

The following packages are required by different Emacs packages enabled in the configuration:


```shell
sudo apt install ripgrep
```

If this is installed in a WSL2 distribution, add the full theme to remove the error messages:

```shell
sudo apt install adwaita-icon-theme-full
```

Then install win32yank (most likely through a package manager like Chocolatey) as the copy & paste
behavior from Emacs to Windows is broker.

Clone the Emacs repository:

```shell
git clone git://git.sv.gnu.org/emacs.git
```

```shell
cd emacs
```

... and check out the 29 branch:

```shell
git checkout emacs-29
```

### Compilation

Make sure there aren't any artefacts left after previous compilations:

```shell
git clean -fdx
```

Configure Emacs with the required features:

```shell
./autogen.sh
```

```shell
./configure --with-native-compilation --with-json --with-rsvg --with-xml2 --with-pgtk --without-compress-install CC=gcc-10
```

Build, using as many cores as possible:

```shell
make --jobs=$(nproc)
```

Finally, install Emacs:

```shell
sudo make install
```
