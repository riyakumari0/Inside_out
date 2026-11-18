from django.core.management.base import BaseCommand
from django.db.models import Q

from wardrobe.models import Item, Look
from wardrobe.outfit_images import refresh_collage, refresh_cutout


class Command(BaseCommand):
    help = 'Makes background-free cut-outs for pieces that lack one, then (re)builds every look collage.'

    def add_arguments(self, parser):
        parser.add_argument('--all', action='store_true', help='Redo cut-outs for every piece, not only missing ones')

    def handle(self, all=False, **options):
        items = Item.objects.exclude(Q(image='') | Q(image__isnull=True))
        if all:
            items = items.filter(cutout_ai=False)  # keep AI clean-ups (they cost an image each)
        else:
            items = items.filter(Q(cutout='') | Q(cutout__isnull=True))
        made = 0
        for item in items:
            refresh_cutout(item)
            made += 1
            self.stdout.write(f'  cut-out {made}: {item.name}')
        looks = Look.objects.prefetch_related('items')
        for look in looks:
            refresh_collage(look)
        self.stdout.write(self.style.SUCCESS(f'Done: {made} cut-outs, {looks.count()} collages.'))
