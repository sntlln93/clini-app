FROM composer:2.10.3 AS vendor
WORKDIR /app
COPY database/ database/
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --no-progress \
    --optimize-autoloader

FROM php:8.5.12-fpm-alpine AS runtime

RUN apk add --no-cache nginx supervisor postgresql-dev shadow \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/cache/apk/*

RUN echo "opcache.enable=1" > /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.validate_timestamps=0" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.jit=tracing" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.jit_buffer_size=64M" >> /usr/local/etc/php/conf.d/opcache.ini

# Stack traces in logs and failed_jobs would otherwise carry each frame's
# arguments: a DNI, an email or a name passed to an Action (#322).
RUN echo "zend.exception_ignore_args=On" > /usr/local/etc/php/conf.d/exceptions.ini

# The API reads no upload progress and never shows a fatal error's backtrace:
# both features only widen what a request can reach (#349).
RUN echo "session.upload_progress.enabled=0" > /usr/local/etc/php/conf.d/hardening.ini \
    && echo "fatal_error_backtraces=0" >> /usr/local/etc/php/conf.d/hardening.ini

WORKDIR /var/www/html

COPY --from=vendor /app/vendor ./vendor
COPY . .

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor.d/app.ini
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN chown -R www-data:www-data storage bootstrap/cache

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor.d/app.ini"]
