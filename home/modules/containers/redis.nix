{ ... }:
{
  xdg.configFile."containers/systemd/redis.container".source =
    ../../../files/containers/redis.container;
}
