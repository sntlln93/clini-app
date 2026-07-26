<?php

declare(strict_types=1);

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Support\Facades\Mail;

final class TestMailTransportMailable extends Mailable
{
    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Test mail transport subject');
    }

    public function content(): Content
    {
        return new Content(htmlString: '<p>Test mail transport body</p>');
    }
}

test('a mailable is sent through the fake mail transport', function () {
    Mail::fake();

    Mail::to('recipient@example.com')->send(new TestMailTransportMailable);

    Mail::assertSent(TestMailTransportMailable::class, function (TestMailTransportMailable $mailable) {
        return $mailable->hasTo('recipient@example.com')
            && $mailable->envelope()->subject === 'Test mail transport subject';
    });
});

test('the test suite never leaves the array mailer', function () {
    expect(config('mail.default'))->toBe('array');
});

test('the resend mailer is configured with the resend transport', function () {
    expect(config('mail.mailers.resend.transport'))->toBe('resend');
});

test('the resend sdk is installed', function () {
    expect(class_exists(Resend::class))->toBeTrue();
});
