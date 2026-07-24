{ ... }:
{
  xdg.configFile."containers/systemd/memcached.container".source =
    ../../../files/containers/memcached.container;
}
